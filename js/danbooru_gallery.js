/**
 * ComfyUI Danbooru Gallery Frontend
 * 基于 Danbooru API 的图像搜索和画廊界面
 */

import { app } from "../../scripts/app.js";
import { ComfyDialog, $el } from "../../scripts/ui.js";

class DanbooruGalleryDialog extends ComfyDialog {
    constructor() {
        super();
        this.element = $el("div.comfy-modal.danbooru-gallery", {
            parent: document.body,
            style: {
                display: "none"
            }
        }, [
            $el("div.comfy-modal-content", {
                style: {
                    width: "90vw",
                    maxWidth: "1200px",
                    height: "80vh",
                    maxHeight: "800px"
                }
            }, [
                this.createHeader(),
                this.createSearchBar(),
                this.createContent(),
                this.createFooter()
            ])
        ]);

        this.posts = [];
        this.currentPage = 1;
        this.isLoading = false;
        this.selectedItem = null;
        this.currentTab = "search"; // search, favorites
    }

    createHeader() {
        return $el("div.danbooru-header", {
            style: {
                padding: "10px 20px",
                borderBottom: "1px solid #ccc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }
        }, [
            $el("h2", {
                textContent: "Danbooru Gallery",
                style: { margin: 0, fontSize: "18px" }
            }),
            $el("div", {
                style: { display: "flex", gap: "10px" }
            }, [
                $el("button.btn-secondary", {
                    textContent: "Settings",
                    onclick: () => this.showSettings()
                }),
                $el("button.btn-secondary", {
                    textContent: "Close",
                    onclick: () => this.close()
                })
            ])
        ]);
    }

    createSearchBar() {
        this.searchInput = $el("input", {
            type: "text",
            placeholder: "Enter tags (e.g., 1girl, blue_eyes, smile)",
            style: {
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px"
            },
            onkeydown: (e) => {
                if (e.key === "Enter") {
                    this.searchPosts();
                }
            }
        });

        this.ratingSelect = $el("select", {
            style: {
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px"
            }
        }, [
            $el("option", { value: "all", textContent: "All Ratings" }),
            $el("option", { value: "safe", textContent: "Safe" }),
            $el("option", { value: "questionable", textContent: "Questionable" }),
            $el("option", { value: "explicit", textContent: "Explicit" })
        ]);

        return $el("div.danbooru-search-bar", {
            style: {
                padding: "15px 20px",
                borderBottom: "1px solid #ccc",
                display: "flex",
                gap: "10px",
                alignItems: "center"
            }
        }, [
            this.searchInput,
            this.ratingSelect,
            $el("button.btn-primary", {
                textContent: "Search",
                onclick: () => this.searchPosts()
            }),
            $el("button.btn-secondary", {
                textContent: "Clear",
                onclick: () => {
                    this.searchInput.value = "";
                    this.searchPosts();
                }
            })
        ]);
    }

    createContent() {
        this.tabsContainer = $el("div.danbooru-tabs", {
            style: {
                padding: "0 20px",
                borderBottom: "1px solid #ccc"
            }
        }, [
            $el("button.tab-button", {
                textContent: "Search Results",
                className: "active",
                onclick: () => this.switchTab("search")
            }),
            $el("button.tab-button", {
                textContent: "Favorites",
                onclick: () => this.switchTab("favorites")
            })
        ]);

        this.postsGrid = $el("div.danbooru-posts-grid", {
            style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "15px",
                padding: "20px",
                overflowY: "auto",
                height: "calc(100% - 200px)"
            }
        });

        this.loadingIndicator = $el("div.loading-indicator", {
            style: {
                display: "none",
                textAlign: "center",
                padding: "20px",
                color: "#666"
            }
        }, [
            $el("div", { textContent: "Loading..." })
        ]);

        return $el("div.danbooru-content", {
            style: {
                flex: 1,
                display: "flex",
                flexDirection: "column"
            }
        }, [
            this.tabsContainer,
            this.postsGrid,
            this.loadingIndicator
        ]);
    }

    createFooter() {
        this.loadMoreButton = $el("button.btn-secondary", {
            textContent: "Load More",
            style: { display: "none" },
            onclick: () => this.loadMorePosts()
        });

        return $el("div.danbooru-footer", {
            style: {
                padding: "10px 20px",
                borderTop: "1px solid #ccc",
                display: "flex",
                justifyContent: "center"
            }
        }, [
            this.loadMoreButton
        ]);
    }

    async searchPosts(page = 1) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            const tags = this.searchInput.value.trim();
            const rating = this.ratingSelect.value;

            const params = new URLSearchParams({
                tags: tags,
                page: page,
                limit: 20,
                rating: rating
            });

            const response = await fetch(`/danbooru_gallery/posts?${params}`);
            const data = await response.json();

            if (page === 1) {
                this.posts = [];
            }

            this.posts = [...this.posts, ...data.posts];
            this.currentPage = page;
            this.hasMore = data.pagination.has_more;

            this.renderPosts();
            this.updateLoadMoreButton();

        } catch (error) {
            console.error("Error searching posts:", error);
            this.showError("Failed to load posts. Please try again.");
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    async loadFavorites(page = 1) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            const params = new URLSearchParams({
                page: page,
                limit: 20
            });

            const response = await fetch(`/danbooru_gallery/get_favorites?${params}`);
            const data = await response.json();

            if (page === 1) {
                this.posts = [];
            }

            this.posts = [...this.posts, ...data.items];
            this.currentPage = page;
            this.hasMore = data.pagination.currentPage < data.pagination.totalPages;

            this.renderPosts();
            this.updateLoadMoreButton();

        } catch (error) {
            console.error("Error loading favorites:", error);
            this.showError("Failed to load favorites. Please try again.");
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    renderPosts() {
        this.postsGrid.innerHTML = "";

        if (this.posts.length === 0) {
            this.postsGrid.appendChild($el("div.no-posts", {
                textContent: "No posts found.",
                style: {
                    textAlign: "center",
                    color: "#666",
                    fontSize: "16px",
                    padding: "40px"
                }
            }));
            return;
        }

        this.posts.forEach(post => {
            const postElement = this.createPostElement(post);
            this.postsGrid.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const imageUrl = post.preview_file_url || post.file_url;

        return $el("div.post-item", {
            style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s",
                backgroundColor: "#fff"
            },
            onmouseover: (e) => {
                e.target.style.transform = "scale(1.02)";
            },
            onmouseout: (e) => {
                e.target.style.transform = "scale(1)";
            },
            onclick: () => this.selectPost(post)
        }, [
            $el("div.post-image-container", {
                style: {
                    position: "relative",
                    height: "200px",
                    overflow: "hidden"
                }
            }, [
                $el("img", {
                    src: imageUrl,
                    style: {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block"
                    },
                    onerror: (e) => {
                        e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
                    }
                }),
                $el("div.post-rating", {
                    textContent: post.rating?.toUpperCase() || "U",
                    style: {
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        backgroundColor: this.getRatingColor(post.rating),
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }
                })
            ]),
            $el("div.post-info", {
                style: {
                    padding: "10px"
                }
            }, [
                $el("div.post-score", {
                    textContent: `Score: ${post.score || 0}`,
                    style: {
                        fontSize: "12px",
                        color: "#666",
                        marginBottom: "5px"
                    }
                }),
                $el("div.post-tags", {
                    textContent: post.tag_string?.split(" ").slice(0, 3).join(", ") + (post.tag_string?.split(" ").length > 3 ? "..." : ""),
                    style: {
                        fontSize: "12px",
                        color: "#888",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }
                })
            ])
        ]);
    }

    getRatingColor(rating) {
        switch (rating) {
            case "safe": return "#4CAF50";
            case "questionable": return "#FF9800";
            case "explicit": return "#F44336";
            default: return "#9E9E9E";
        }
    }

    selectPost(post) {
        this.selectedItem = post;

        // 通知 ComfyUI 节点
        if (this.node) {
            const selectionData = {
                item: post,
                download_image: true
            };

            this.node.widgets.find(w => w.name === "selection_data")?.value = JSON.stringify(selectionData);
            this.node.widgets.find(w => w.name === "danbooru_gallery_unique_id_widget")?.value = Date.now().toString();

            // 触发节点更新
            app.graph.setDirtyCanvas(true);
        }

        // 可视化选中状态
        this.highlightSelectedPost(post.id);
    }

    highlightSelectedPost(postId) {
        // 移除之前的选中状态
        this.postsGrid.querySelectorAll(".post-item").forEach(item => {
            item.style.borderColor = "#ddd";
            item.style.boxShadow = "none";
        });

        // 添加新的选中状态
        const selectedElement = this.postsGrid.querySelector(`[data-post-id="${postId}"]`);
        if (selectedElement) {
            selectedElement.style.borderColor = "#007bff";
            selectedElement.style.boxShadow = "0 0 10px rgba(0, 123, 255, 0.3)";
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        // 更新标签按钮状态
        this.tabsContainer.querySelectorAll(".tab-button").forEach(btn => {
            btn.classList.remove("active");
        });
        event.target.classList.add("active");

        // 重新加载内容
        if (tab === "search") {
            this.searchPosts(1);
        } else if (tab === "favorites") {
            this.loadFavorites(1);
        }
    }

    loadMorePosts() {
        if (this.currentTab === "search") {
            this.searchPosts(this.currentPage + 1);
        } else if (this.currentTab === "favorites") {
            this.loadFavorites(this.currentPage + 1);
        }
    }

    updateLoadMoreButton() {
        if (this.hasMore && !this.isLoading) {
            this.loadMoreButton.style.display = "block";
        } else {
            this.loadMoreButton.style.display = "none";
        }
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? "block" : "none";
    }

    showError(message) {
        // 创建错误提示
        const errorDiv = $el("div.error-message", {
            textContent: message,
            style: {
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "10px",
                borderRadius: "4px",
                margin: "10px 20px",
                border: "1px solid #f5c6cb"
            }
        });

        // 移除之前的错误消息
        const existingError = this.element.querySelector(".error-message");
        if (existingError) {
            existingError.remove();
        }

        this.element.querySelector(".danbooru-content").prepend(errorDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    showSettings() {
        // 创建设置对话框
        const settingsDialog = new ComfyDialog();
        settingsDialog.element = $el("div.comfy-modal.danbooru-settings", {
            parent: document.body
        }, [
            $el("div.comfy-modal-content", {
                style: { width: "400px", maxHeight: "500px" }
            }, [
                $el("div.comfy-modal-header", [
                    $el("h3", { textContent: "Danbooru Settings" })
                ]),
                $el("div.comfy-modal-body", {
                    style: { padding: "20px" }
                }, [
                    $el("div.setting-group", { style: { marginBottom: "20px" } }, [
                        $el("label", {
                            textContent: "Username:",
                            style: { display: "block", marginBottom: "5px" }
                        }),
                        $el("input", {
                            type: "text",
                            id: "danbooru-username",
                            style: { width: "100%", padding: "8px" }
                        })
                    ]),
                    $el("div.setting-group", { style: { marginBottom: "20px" } }, [
                        $el("label", {
                            textContent: "API Key:",
                            style: { display: "block", marginBottom: "5px" }
                        }),
                        $el("input", {
                            type: "password",
                            id: "danbooru-api-key",
                            style: { width: "100%", padding: "8px" }
                        })
                    ]),
                    $el("div.setting-group", [
                        $el("button.btn-primary", {
                            textContent: "Test Connection",
                            onclick: () => this.testConnection()
                        }),
                        $el("button.btn-secondary", {
                            textContent: "Save",
                            onclick: () => this.saveSettings(settingsDialog)
                        })
                    ])
                ])
            ])
        ]);

        settingsDialog.show();
    }

    async testConnection() {
        try {
            const response = await fetch("/danbooru_gallery/test_connection");
            const result = await response.json();

            if (result.status === "success") {
                alert("Connection successful! " + (result.has_credentials ? "Using authenticated access." : "Using anonymous access."));
            } else {
                alert("Connection failed: " + result.message);
            }
        } catch (error) {
            alert("Connection test failed: " + error.message);
        }
    }

    async saveSettings(dialog) {
        const username = document.getElementById("danbooru-username").value;
        const apiKey = document.getElementById("danbooru-api-key").value;

        try {
            const response = await fetch("/danbooru_gallery/save_credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, api_key: apiKey })
            });

            const result = await response.json();

            if (result.status === "success") {
                alert("Settings saved successfully!");
                dialog.close();
            } else {
                alert("Failed to save settings: " + result.message);
            }
        } catch (error) {
            alert("Failed to save settings: " + error.message);
        }
    }

    show(node) {
        this.node = node;
        super.show();

        // 加载初始数据
        this.searchPosts(1);
    }
}

// 注册到 ComfyUI
app.registerExtension({
    name: "ComfyUI.DanbooruGallery",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "DanbooruGalleryNode") {
            // 添加双击打开画廊的功能
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated?.apply(this, arguments);

                // 添加双击事件
                this.addEventListener("dblclick", (e) => {
                    if (!app.dialog?.element?.classList.contains("danbooru-gallery")) {
                        app.dialog = new DanbooruGalleryDialog();
                    }
                    app.dialog.show(this);
                });

                return result;
            };
        }
    }
});

// 添加CSS样式
const style = document.createElement("style");
style.textContent = `
    .danbooru-gallery .btn-primary {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
    }

    .danbooru-gallery .btn-secondary {
        background-color: #6c757d;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
    }

    .danbooru-gallery .btn-primary:hover {
        background-color: #0056b3;
    }

    .danbooru-gallery .btn-secondary:hover {
        background-color: #545b62;
    }

    .danbooru-gallery .tab-button {
        background: none;
        border: none;
        padding: 10px 20px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
    }

    .danbooru-gallery .tab-button.active {
        border-bottom-color: #007bff;
        color: #007bff;
    }

    .danbooru-gallery .post-item:hover {
        transform: scale(1.02);
    }

    .danbooru-gallery .loading-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
    }
`;

document.head.appendChild(style);