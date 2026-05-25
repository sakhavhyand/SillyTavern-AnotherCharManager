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

        // Clear container
        this.container.innerHTML = '';
        // Listen to scroll on the container itself
        this._onScroll = () => this.render();
        this.container.addEventListener('scroll', this._onScroll, { passive: true });
        // Initial render
        this.render();
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
    * Renders the visible range of items within the container, while optionally preserving the scroll position.
    * Generates spacers to maintain the correct layout and ensures only visible items are rendered for performance optimization.
    *
    * @param {boolean} preserveScroll - Indicates whether to preserve the current scroll position (default is true).
    * @return {void} This method does not return a value.
    */
    render(preserveScroll = false) {
        const newRange = this.calculateVisibleRange();
        // Save the scroll position if we want to preserve it
        const scrollTop = preserveScroll ? this.container.scrollTop : null;
        // Create visible elements with spacers to maintain the scroll position
        const fragment = document.createDocumentFragment();

        // Add top spacer
        if (newRange.start > 0) {
            const topSpacer = document.createElement('div');
            const topRows = Math.floor(newRange.start / this.itemsPerRow);
            topSpacer.style.height = `${topRows * this.itemHeight}px`;
            topSpacer.style.width = '100%'; // Full width to force line break in flex
            topSpacer.style.flexShrink = '0';
            fragment.appendChild(topSpacer);
        }

        // Add visible items
        for (let i = newRange.start; i < newRange.end; i++) {
            if (this.items[i]) {
                const element = this.renderItem(this.items[i]);
                fragment.appendChild(element);
            }
        }

        // Add bottom spacer
        const remainingItems = this.items.length - newRange.end;
        if (remainingItems > 0) {
            const bottomSpacer = document.createElement('div');
            const bottomRows = Math.ceil(remainingItems / this.itemsPerRow);
            bottomSpacer.style.height = `${bottomRows * this.itemHeight}px`;
            bottomSpacer.style.width = '100%'; // Full width to force line break in flex
            bottomSpacer.style.flexShrink = '0';
            fragment.appendChild(bottomSpacer);
        }

        // Cancel in-flight image loads before replacing content
        this.container.querySelectorAll('img').forEach(img => { img.src = ''; });
        this.container.innerHTML = '';
        this.container.appendChild(fragment);

        // Restore the scroll position if needed
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
