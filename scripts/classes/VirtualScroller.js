/**
 * A class for rendering a virtualized scrolling container, improving performance
 * for large data sets by only rendering visible elements and placeholders.
 */
export class VirtualScroller {
    constructor(options = {}) {
        this.container = options.container; // This should be #character-list
        this.items = options.items || [];
        this.renderItem = options.renderItem;
        this.itemHeight = options.itemHeight || 150;
        this.itemsPerRow = options.itemsPerRow || 5;
        this.buffer = options.buffer || 2;
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('VirtualScroller: container is required');
            return;
        }

        this.container.innerHTML = '';
        this._onScroll = () => this.render();
        this.container.addEventListener('scroll', this._onScroll, { passive: true });
        this._doRender();
    }

    calculateVisibleRange() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;

        // Calculate visible rows
        const startRow = Math.floor(scrollTop / this.itemHeight);
        const endRow = Math.ceil((scrollTop + containerHeight) / this.itemHeight);

        // Add buffer
        const bufferedStartRow = Math.max(0, startRow - this.buffer);
        const bufferedEndRow = Math.min(
            Math.ceil(this.items.length / this.itemsPerRow),
            endRow + this.buffer,
        );

        // Convert to item indices
        const start = bufferedStartRow * this.itemsPerRow;
        const end = Math.min(bufferedEndRow * this.itemsPerRow, this.items.length);

        return { start, end };
    }

    /**
     * Schedules a render on the next animation frame. If a render is already
     * scheduled, this call is a no-op, effectively throttling to ~60 fps.
     *
     * @param {boolean} preserveScroll
     * @return {void}
     */
    render(preserveScroll = false) {
        if (this._renderScheduled) return;
        this._renderScheduled = true;
        this._pendingPreserveScroll = preserveScroll;
        requestAnimationFrame(() => {
            this._renderScheduled = false;
            this._doRender(this._pendingPreserveScroll);
        });
    }

    /**
     * Internal render — rebuilds spacers and visible items.
     */
    _doRender(preserveScroll = false) {
        const newRange = this.calculateVisibleRange();
        const scrollTop = preserveScroll ? this.container.scrollTop : null;
        const fragment = document.createDocumentFragment();

        // Top spacer
        if (newRange.start > 0) {
            const topSpacer = document.createElement('div');
            topSpacer.style.cssText =
                `height:${Math.floor(newRange.start / this.itemsPerRow) * this.itemHeight}px;width:100%;flex-shrink:0`;
            fragment.appendChild(topSpacer);
        }

        // Visible items
        for (let i = newRange.start; i < newRange.end; i++) {
            if (this.items[i]) {
                fragment.appendChild(this.renderItem(this.items[i]));
            }
        }

        // Bottom spacer
        const remainingItems = this.items.length - newRange.end;
        if (remainingItems > 0) {
            const bottomSpacer = document.createElement('div');
            bottomSpacer.style.cssText =
                `height:${Math.ceil(remainingItems / this.itemsPerRow) * this.itemHeight}px;width:100%;flex-shrink:0`;
            fragment.appendChild(bottomSpacer);
        }

        // Cancel in-flight image loads before replacing content
        this.container.querySelectorAll('img').forEach(img => { img.src = ''; });
        this.container.replaceChildren(fragment);

        if (preserveScroll && scrollTop !== null) {
            this.container.scrollTop = scrollTop;
        }
    }

    /**
     * Updates the list of items and triggers re-rendering.
     *
     * @param {Array} items - The new array of items to be set.
     * @param {boolean} [preserveScroll=false] - A flag indicating whether to preserve the current scroll position during rendering.
     * @return {void}
     */
    setItems(items, preserveScroll = false) {
        this.items = items;
        this.render(preserveScroll);
    }

    /**
     * Refreshes the display (useful after resize)
     */
    refresh() {
        this.render(true);
    }

    /**
     * Gets the index of an item by its avatar
     * @param {string} avatar - The unique avatar identifier
     * @returns {number} The index of the item, or -1 if not found
     */
    getIndexByAvatar(avatar) {
        return this.items.findIndex(item => item.avatar === avatar);
    }

    /**
     * Scrolls to a specific item by its avatar string
     * @param {string} avatar - The unique avatar identifier of the item
     * @param {string} behavior - Scroll behavior: 'auto' or 'smooth' (default: 'auto')
     */
    scrollToAvatar(avatar, behavior = 'auto') {
        // Find the index of the item with this avatar
        const index = this.getIndexByAvatar(avatar);

        if (index === -1) {
            console.warn(`Item with avatar "${avatar}" not found`);
            return;
        }

        // Calculate which row this item is in
        const row = Math.floor(index / this.itemsPerRow);
        const scrollTop = row * this.itemHeight;

        // Scroll to position
        this.container.scrollTo({
            top: scrollTop,
            behavior: behavior,
        });
    }

    /**
     * Cleans up resources
     */
    destroy() {
        if (this._onScroll) {
            this.container.removeEventListener('scroll', this._onScroll);
            this._onScroll = null;
        }
        this.container.querySelectorAll('img').forEach(img => { img.src = ''; });
        this.container.innerHTML = '';
    }
}
