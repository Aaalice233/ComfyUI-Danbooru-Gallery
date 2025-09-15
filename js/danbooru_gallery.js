import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";

app.registerExtension({
    name: "Comfy.DanbooruGallery",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "DanbooruGalleryNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.setSize([750, 938]);

                const container = $el("div.danbooru-gallery");
                const widget = this.addDOMWidget("danbooru_gallery_widget", "div", container, {
                    onDraw: () => { }
                });

                // 确保在 widget 渲染后调整大小
                setTimeout(() => {
                    this.onResize(this.size);
                }, 10);

                let posts = [], currentPage = 1, isLoading = false;

                const searchInput = $el("input", { type: "text", placeholder: "Tags (Max 2, e.g., 1girl, blue_eyes)..." });
                const ratingSelect = $el("select", {}, [
                    ["", "ALL"], ["general", "General"], ["sensitive", "Sensitive"], ["questionable", "Questionable"], ["explicit", "Explicit"]
                ].map(r => $el("option", { value: r[0], textContent: r[1] })));

                const refreshButton = $el("button.danbooru-refresh-button", {
                    title: "Refresh"
                });
                refreshButton.innerHTML = `
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                       <polyline points="23 4 23 10 17 10"></polyline>
                       <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                   </svg>`;

                const imageGrid = $el("div.danbooru-image-grid");

                const fetchAndRender = async (reset = false) => {
                    if (isLoading) return;
                    isLoading = true;
                    refreshButton.classList.add("loading");
                    refreshButton.disabled = true;

                    const loadingIndicator = imageGrid.querySelector('.danbooru-loading');
                    if (!loadingIndicator) {
                        imageGrid.insertAdjacentHTML('beforeend', `<p class="danbooru-status danbooru-loading">Loading...</p>`);
                    }

                    if (reset) {
                        currentPage = 1;
                        posts = [];
                        imageGrid.innerHTML = "";
                        imageGrid.insertAdjacentHTML('beforeend', `<p class="danbooru-status danbooru-loading">Loading...</p>`);
                    }

                    try {
                        // 从黑名单输入中提取标签
                        const blacklistedInput = this.inputs.find(i => i.name === 'blacklisted_tags');
                        let blacklistedTags = "";
                        if (blacklistedInput && blacklistedInput.link !== null) {
                            const node_id = this.graph.links[blacklistedInput.link].origin_id;
                            const originNode = this.graph.getNodeById(node_id);
                            if (originNode && originNode.outputs && originNode.outputs.length > 0) {
                                // 假设黑名单标签在一个字符串输出中，以逗号分隔
                                const outputData = originNode.outputs[0].value;
                                if (typeof outputData === 'string') {
                                    blacklistedTags = outputData;
                                }
                            }
                        }

                        const params = new URLSearchParams({
                            "search[tags]": searchInput.value.replace(/,/g, ' ').trim(),
                            "search[rating]": ratingSelect.value,
                            limit: "100",
                            page: currentPage,
                        });


                        if (blacklistedTags) {
                            params.append("blacklisted_tags", blacklistedTags);
                        }

                        const response = await fetch(`/danbooru_gallery/posts?${params}`);
                        let newPosts = await response.json();

                        if (!Array.isArray(newPosts)) throw new Error("API did not return a valid list of posts.");

                        // The backend now handles all blacklisting logic.

                        if (newPosts.length === 0 && reset) {
                            imageGrid.innerHTML = `<p class="danbooru-status">No results found.</p>`;
                            return;
                        }

                        currentPage++;
                        posts.push(...newPosts);
                        newPosts.forEach(renderPost);

                    } catch (e) {
                        imageGrid.innerHTML = `<p class="danbooru-status error">${e.message}</p>`;
                    } finally {
                        isLoading = false;
                        refreshButton.classList.remove("loading");
                        refreshButton.disabled = false;
                        const indicator = imageGrid.querySelector('.danbooru-loading');
                        if (indicator) {
                            indicator.remove();
                        }
                    }
                };

                const resizeGrid = () => {
                    const rowGap = parseInt(window.getComputedStyle(imageGrid).getPropertyValue('grid-row-gap'));
                    const rowHeight = parseInt(window.getComputedStyle(imageGrid).getPropertyValue('grid-auto-rows'));

                    Array.from(imageGrid.children).forEach((wrapper) => {
                        const img = wrapper.querySelector('img');
                        if (img && img.clientHeight > 0) {
                            const spans = Math.ceil((img.clientHeight + rowGap) / (rowHeight + rowGap));
                            wrapper.style.gridRowEnd = `span ${spans}`;
                        }
                    });
                }

                const createPostElement = (post) => {
                    if (!post.id || !post.preview_file_url) return null;

                    const wrapper = $el("div.danbooru-image-wrapper");
                    const img = $el("img", {
                        src: `${post.preview_file_url}?v=${post.md5}`,
                        loading: "lazy",
                        onload: resizeGrid,
                        onerror: () => { wrapper.style.display = 'none'; },
                        onclick: async () => {
                            const isSelected = wrapper.classList.contains('selected');
                            // 在单选模式下，清除所有其他选项
                            imageGrid.querySelectorAll('.danbooru-image-wrapper').forEach(w => w.classList.remove('selected'));

                            if (!isSelected) {
                                wrapper.classList.add('selected');
                                try {
                                    const response = await fetch('/danbooru_gallery/fetch_image', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ url: post.file_url }),
                                    });
                                    if (!response.ok) {
                                        throw new Error(`Failed to fetch image: ${response.statusText}`);
                                    }
                                    const data = await response.json();

                                    // 设置第一个输出为 ComfyUI 的图像张量
                                    this.setOutputData(0, {
                                        "ui": {
                                            "images": [
                                                {
                                                    "filename": "danbooru_image.png",
                                                    "subfolder": "",
                                                    "type": "temp",
                                                    "format": "image/png"
                                                }
                                            ]
                                        },
                                        "result": [data.image_data]
                                    });

                                    // 设置第二个输出为提示词
                                    this.setOutputData(1, post.tag_string);

                                } catch (error) {
                                    console.error("Danbooru Gallery: " + error);
                                    // Handle error, maybe show a notification to the user
                                }
                            } else {
                                // 如果再次点击，则取消选择
                                wrapper.classList.remove('selected');
                                // 清空两个输出
                                this.setOutputData(0, null);
                                this.setOutputData(1, null);
                            }
                        },
                    });

                    const tooltip = $el("div.danbooru-tag-tooltip", { style: { display: "none", position: "absolute", zIndex: "1000" } });
                    const tagsContainer = $el("div", { className: "danbooru-tooltip-tags" });
                    let leaveTimeout;

                    tooltip.appendChild(tagsContainer);
                    document.body.appendChild(tooltip);

                    const createTagSpan = (tag, category) => $el("span", {
                        textContent: tag,
                        className: `danbooru-tooltip-tag tag-category-${category}`,
                    });

                    wrapper.addEventListener("mouseenter", (e) => {
                        clearTimeout(leaveTimeout);
                        tagsContainer.innerHTML = '';

                        // Details Section
                        const detailsSection = $el("div.danbooru-tooltip-section");
                        detailsSection.appendChild($el("div.danbooru-tooltip-category-header", { textContent: "Details" }));
                        if (post.created_at) {
                            const date = new Date(post.created_at);
                            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                            detailsSection.appendChild($el("div", { textContent: `Uploaded: ${formattedDate}`, className: "danbooru-tooltip-upload-date" }));
                        }
                        tagsContainer.appendChild(detailsSection);

                        // Tags Processing
                        const categoryOrder = ["artist", "copyright", "character", "general", "meta"];
                        const categorizedTags = {
                            artist: new Set(),
                            copyright: new Set(),
                            character: new Set(),
                            general: new Set(),
                            meta: new Set()
                        };

                        if (post.tag_string_artist) post.tag_string_artist.split(' ').forEach(t => categorizedTags.artist.add(t));
                        if (post.tag_string_copyright) post.tag_string_copyright.split(' ').forEach(t => categorizedTags.copyright.add(t));
                        if (post.tag_string_character) post.tag_string_character.split(' ').forEach(t => categorizedTags.character.add(t));
                        if (post.tag_string_general) post.tag_string_general.split(' ').forEach(t => categorizedTags.general.add(t));
                        if (post.tag_string_meta) post.tag_string_meta.split(' ').forEach(t => categorizedTags.meta.add(t));

                        // Fallback for older posts or different tag string formats
                        if (Object.values(categorizedTags).every(s => s.size === 0) && post.tag_string) {
                            post.tag_string.split(' ').forEach(t => categorizedTags.general.add(t));
                        }

                        // Render all tag categories
                        categoryOrder.forEach(categoryName => {
                            if (categorizedTags[categoryName].size > 0) {
                                const section = $el("div.danbooru-tooltip-section");
                                section.appendChild($el("div.danbooru-tooltip-category-header", { textContent: categoryName.charAt(0).toUpperCase() + categoryName.slice(1) }));
                                const tagsWrapper = $el("div.danbooru-tooltip-tags-wrapper");
                                categorizedTags[categoryName].forEach(t => tagsWrapper.appendChild(createTagSpan(t, categoryName)));
                                section.appendChild(tagsWrapper);
                                tagsContainer.appendChild(section);
                            }
                        });

                        tooltip.style.display = "block";
                    });

                    wrapper.addEventListener("mouseleave", () => {
                        tooltip.style.display = "none";
                    });

                    wrapper.addEventListener("mousemove", (e) => {
                        if (tooltip.style.display !== 'block') return;
                        const rect = tooltip.getBoundingClientRect();
                        const buffer = 15;
                        let newLeft = e.clientX + buffer, newTop = e.clientY + buffer;
                        if (newLeft + rect.width > window.innerWidth) newLeft = e.clientX - rect.width - buffer;
                        if (newTop + rect.height > window.innerHeight) newTop = e.clientY - rect.height - buffer;
                        tooltip.style.left = `${newLeft + window.scrollX}px`;
                        tooltip.style.top = `${newTop + window.scrollY}px`;
                    });

                    wrapper.appendChild(img);
                    return wrapper;
                };

                const renderPost = (post) => {
                    const element = createPostElement(post);
                    if (element) {
                        imageGrid.appendChild(element);
                    }
                };

                const observer = new ResizeObserver(resizeGrid);
                observer.observe(imageGrid);

                imageGrid.addEventListener("scroll", () => {
                    if (imageGrid.scrollHeight - imageGrid.scrollTop - imageGrid.clientHeight < 400) {
                        fetchAndRender(false);
                    }
                });

                searchInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") fetchAndRender(true);
                });
                ratingSelect.addEventListener("change", () => {
                    // Hide any visible tooltips before fetching new content
                    const tooltips = document.querySelectorAll('.danbooru-tag-tooltip');
                    tooltips.forEach(tooltip => tooltip.style.display = 'none');
                    fetchAndRender(true);
                });
                refreshButton.addEventListener("click", () => fetchAndRender(true));

                const sortIndicator = $el("div.danbooru-sort-indicator", {
                    textContent: "Sorted by: Newest Uploads"
                });

                container.appendChild($el("div.danbooru-controls", [searchInput, ratingSelect, refreshButton]));
                container.appendChild(sortIndicator);
                container.appendChild(imageGrid);

                const insertNewPost = (post) => {
                    const newElement = createPostElement(post);
                    if (newElement) {
                        imageGrid.prepend(newElement);
                        newElement.classList.add('new-item');
                        newElement.addEventListener('animationend', () => newElement.classList.remove('new-item'));
                        resizeGrid();
                    }
                };
                // 页面加载时直接获取第一页的帖子
                fetchAndRender(true);

                this.onResize = (size) => {
                    const [width, height] = size;
                    const controlsHeight = container.querySelector('.danbooru-controls')?.offsetHeight || 0;
                    if (controlsHeight > 0) {
                        imageGrid.style.height = `${height - controlsHeight - 10}px`;
                    }
                }
            };
        }
    },
});

$el("style", {
    textContent: `
    .danbooru-gallery { width: 100%; display: flex; flex-direction: column; min-height: 200px; }
    .danbooru-controls { display: flex; gap: 5px; margin-bottom: 5px; }
    .danbooru-auth-controls { display: flex; gap: 5px; }
    .danbooru-sort-indicator { font-size: 0.8em; color: #888; text-align: center; margin-bottom: 5px; }
    .danbooru-controls > * { flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid var(--input-border-color); background-color: var(--comfy-input-bg); color: var(--comfy-input-text); }
    .danbooru-controls > select { flex-grow: 0; min-width: 100px; }
    .danbooru-image-wrapper.new-item { animation: fadeInUp 0.5s ease-out; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .danbooru-refresh-button { flex-grow: 0 !important; width: auto; aspect-ratio: 1; padding: 5px !important; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s, transform 0.2s; }
    .danbooru-refresh-button:hover { background-color: var(--comfy-menu-bg); transform: scale(1.1); }
    .danbooru-refresh-button.loading { cursor: not-allowed; }
    .danbooru-refresh-button.loading .icon { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .danbooru-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); grid-gap: 5px; grid-auto-rows: 1px; overflow-y: auto; background-color: var(--comfy-input-bg); padding: 5px; border-radius: 4px; flex-grow: 1; height: 0; }
    .danbooru-image-wrapper {
        grid-row-start: auto;
        border: 2px solid transparent;
        transition: border-color 0.2s, transform 0.2s ease-out, box-shadow 0.2s ease-out;
        border-radius: 6px;
        overflow: hidden;
        position: relative; /* Add relative positioning */
    }
    .danbooru-image-wrapper:hover {
        transform: scale(1.05);
        box-shadow: 0 0 15px rgba(88, 101, 242, 0.7); /* 泛光效果 */
        z-index: 10;
        position: relative;
    }
    .danbooru-image-wrapper.selected {
        border-color: #7B68EE; /* A more vibrant purple */
        box-shadow: 0 0 20px rgba(123, 104, 238, 0.8); /* Stronger glow */
        transform: scale(1.05);
        z-index: 11;
    }

    .danbooru-image-wrapper.selected::after {
        content: "✓";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 50px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
        z-index: 12;
        pointer-events: none;
    }
    
    .danbooru-image-wrapper.selected::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(123, 104, 238, 0.3); /* Semi-transparent overlay */
        z-index: 11;
        pointer-events: none;
    }
    .danbooru-image-grid img {
        width: 100%;
        height: auto;
        cursor: pointer;
        display: block;
    }
    .danbooru-status { text-align: center; width: 100%; margin: 10px 0; color: #ccc; }
    .danbooru-status.error { color: #f55; }
    
        /* New Tooltip Styles */
        @keyframes danbooru-tooltip-fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
    
        .danbooru-tag-tooltip {
            background-color: rgba(28, 29, 31, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
            padding: 8px;
            max-width: 600px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: danbooru-tooltip-fade-in 0.15s ease-out;
            transition: opacity 0.15s, transform 0.15s;
            pointer-events: none; /* Disable mouse interaction */
        }

        .danbooru-tooltip-tags {
            display: flex;
            flex-direction: column;
            gap: 8px; /* Space between sections */
        }

        .danbooru-tooltip-section {
            display: flex;
            flex-direction: column;
        }

        .danbooru-tooltip-upload-date {
            color: #a0a3a8;
            font-size: 0.8em;
            margin-top: 2px;
        }

        .danbooru-tooltip-category-header {
            font-size: 0.85em;
            font-weight: 600;
            color: #b0b3b8;
            margin-bottom: 4px;
        }

        .danbooru-tooltip-tags-wrapper {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
    
        .danbooru-tooltip-tag {
            font-size: 0.8em;
            font-weight: 500;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            cursor: default; /* Change cursor to default */
            transition: none; /* Remove transitions */
        }
    
        .danbooru-tooltip-tag:hover {
            transform: none; /* Remove hover effect */
            filter: none; /* Remove hover effect */
        }
    
        .danbooru-tooltip-tag.copied {
            animation: danbooru-tag-copied-animation 0.6s ease-out;
        }
    
        @keyframes danbooru-tag-copied-animation {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); background-color: #ffffff; color: #000000; }
            100% { transform: scale(1); }
        }
        
        /* Tag Colors */
        /* Tag Colors based on new categories */
        .danbooru-tooltip-tag.tag-category-artist { background-color: #FFF3CD; color: #664D03; } /* Artist: Light Yellow */
        .danbooru-tooltip-tag.tag-category-copyright { background-color: #F8D7DA; color: #58151D; } /* Copyright: Light Pink */
        .danbooru-tooltip-tag.tag-category-character { background-color: #D4EDDA; color: #155724; } /* Character: Light Green */
        .danbooru-tooltip-tag.tag-category-general { background-color: #D1ECF1; color: #0C5460; } /* General: Light Blue */
        .danbooru-tooltip-tag.tag-category-meta { background-color: #F8F9FA; color: #383D41; border: 1px solid #DFE2E5; } /* Meta: Light Grey */
        `,
    parent: document.head,
});

