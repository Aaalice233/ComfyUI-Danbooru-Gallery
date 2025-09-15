import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";

app.registerExtension({
    name: "Comfy.DanbooruGallery",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "DanbooruGalleryNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                this.setSize([500, 625]);

                const container = $el("div.danbooru-gallery");
                const widget = this.addDOMWidget("danbooru_gallery_widget", "div", container, {
                    onDraw: () => { }
                });

                // 确保在 widget 渲染后调整大小
                setTimeout(() => {
                    this.onResize(this.size);
                }, 10);

                let posts = [], currentPage = 1, isLoading = false;

                const searchInput = $el("input", { type: "text", placeholder: "Tags (e.g., 1girl, blue_eyes)..." });
                const ratingSelect = $el("select", {}, [
                    ["g", "General"], ["s", "Sensitive"], ["q", "Questionable"], ["e", "Explicit"]
                ].map(r => $el("option", { value: r[0], textContent: r[1] })));

                const imageGrid = $el("div.danbooru-image-grid");

                const fetchAndRender = async (reset = false) => {
                    if (isLoading) return;
                    isLoading = true;
                    if (reset) {
                        currentPage = 1;
                        posts = [];
                        imageGrid.innerHTML = "";
                    }

                    try {
                        const blacklistLink = this.inputs.find(link => link.name === "blacklist_tags");
                        let blacklistValue = "";
                        if (blacklistLink && this.graph) {
                            const node = this.graph.getNodeById(blacklistLink.link);
                            if (node && node.widgets) {
                                const widget = node.widgets.find(w => w.name === "text");
                                if (widget) {
                                    blacklistValue = widget.value;
                                }
                            }
                        }

                        const params = new URLSearchParams({
                            tags: searchInput.value,
                            blacklist: blacklistValue,
                            rating: ratingSelect.value,
                            page: currentPage
                        });
                        const response = await fetch(`/danbooru_gallery/posts?${params}`);
                        let newPosts = await response.json();

                        if (!Array.isArray(newPosts)) throw new Error("API did not return a valid list of posts.");

                        const blacklist = blacklistValue.split(',').map(t => t.trim()).filter(Boolean);

                        if (blacklist.length > 0) {
                            newPosts = newPosts.filter(post => {
                                const postTags = post.tag_string.split(' ');
                                return !blacklist.some(blacklistedTag => postTags.includes(blacklistedTag));
                            });
                        }

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
                    }
                };

                const renderPost = (post) => {
                    if (!post.id || !post.preview_file_url) return;

                    const img = $el("img", {
                        src: post.preview_file_url,
                        loading: "lazy",
                        title: post.tag_string,
                        onclick: () => {
                            const jsonWidget = this.widgets.find(w => w.name === "selected_post_json");
                            if (jsonWidget) {
                                jsonWidget.value = JSON.stringify(post, null, 2); // 格式化 JSON
                            }
                            this.setDirtyCanvas(true);
                        },
                    });
                    imageGrid.appendChild(img);
                };

                imageGrid.addEventListener("scroll", () => {
                    if (imageGrid.scrollHeight - imageGrid.scrollTop - imageGrid.clientHeight < 400) {
                        fetchAndRender(false);
                    }
                });

                searchInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") fetchAndRender(true);
                });
                ratingSelect.addEventListener("change", () => fetchAndRender(true));

                container.appendChild($el("div.danbooru-controls", [searchInput, ratingSelect]));
                container.appendChild(imageGrid);

                fetchAndRender(true);

                this.onResize = (size) => {
                    const [width, height] = size;
                    const controlsHeight = container.querySelector('.danbooru-controls')?.offsetHeight || 0;
                    if (controlsHeight > 0) {
                        imageGrid.style.height = `${height - controlsHeight - 15}px`;
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
    .danbooru-controls > * { flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid var(--input-border-color); background-color: var(--comfy-input-bg); color: var(--comfy-input-text); }
    .danbooru-controls > select { flex-grow: 0; min-width: 100px; }
    .danbooru-image-grid {  display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 5px; overflow-y: auto; background-color: var(--comfy-input-bg); padding: 5px; border-radius: 4px; flex-grow: 1; height: 0; }
    .danbooru-image-grid img { width: 100%; height: 100px; object-fit: cover; cursor: pointer; border-radius: 4px; transition: filter 0.2s; }
    .danbooru-image-grid img:hover { filter: contrast(1.2) brightness(1.2); }
    .danbooru-status { text-align: center; width: 100%; margin: 10px 0; color: #ccc; }
    .danbooru-status.error { color: #f55; }
    `,
    parent: document.head,
});
