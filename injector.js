(function() {
    'use strict';

    // Early detection flag
    let monacoHooked = false;
    let clipboardEnabled = false;

    // Aggressive CSS override for text selection
    function injectSelectionCSS() {
        const css = `
            *, *::before, *::after, ::slotted(*) {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
                cursor: auto !important;
            }

            /* Force visibility and interaction */
            .monaco-editor, .monaco-editor * {
                user-select: text !important;
                pointer-events: auto !important;
            }

            /* Remove only blocking overlays (keep monaco-mouse-cursor-text visible) */
            .textAreaCover {
               pointer-events: none !important;
            }

            /* Enable selection highlighting */
            ::selection {
                background: #b3d4fc !important;
                color: #000 !important;
            }

            ::-moz-selection {
                background: #b3d4fc !important;
                color: #000 !important;
            }

            /* Shadow DOM support */
            ::shadow *, /deep/ * {
                user-select: text !important;
            }
        `;

        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        (document.head || document.documentElement).appendChild(style);
    }

    // Block future event listener registrations
    function blockEventListeners() {
        const blockedEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'keydown', 'keyup'];
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (blockedEvents.includes(type.toLowerCase())) {
                return; // Silently drop the listener
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // Clear existing global handlers
        blockedEvents.forEach(event => {
            document['on' + event] = null;
            window['on' + event] = null;
        });
    }

    // Dynamic DOM cleanup
    function setupDOMCleanup() {
        function cleanElement(element) {
            if (!element || !element.removeAttribute) return;

            // Remove blocking attributes
            ['oncopy', 'oncut', 'onpaste', 'onselectstart', 'oncontextmenu',
             'ondragstart', 'inert', 'draggable'].forEach(attr => {
                element.removeAttribute(attr);
            });

            // Force text selection styles
            if (element.style) {
                element.style.userSelect = 'text';
                element.style.webkitUserSelect = 'text';
                element.style.MozUserSelect = 'text';
                element.style.msUserSelect = 'text';
            }

            // Remove overlay classes
            if (element.classList) {
                element.classList.remove('no-select', 'noselect', 'unselectable');
            }
        }

        // Clean existing elements
        document.querySelectorAll('*').forEach(cleanElement);

        // Watch for new elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        cleanElement(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll('*').forEach(cleanElement);
                        }
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['oncopy', 'oncut', 'onpaste', 'onselectstart', 'oncontextmenu']
        });
    }

    // Advanced clipboard operations with fallbacks
    async function copyToClipboard(text) {
        if (!text) return false;

        try {
            // Modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {
            // Clipboard API failed, using fallback
        }

        try {
            // Legacy fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, text.length);

            const success = document.execCommand('copy');
            document.body.removeChild(textarea);

            if (success) {
                return true;
            }
        } catch (e) {
            // All copy methods failed
        }

        return false;
    }

    async function pasteFromClipboard() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                return text;
            }
        } catch (e) {
            // Clipboard read failed
        }
        return '';
    }

    // Hook into Monaco Editor instance
    function hookMonacoEditor(editor) {
        if (!editor || editor.__clipboardHooked) return;
        editor.__clipboardHooked = true;

        // Force enable copy-paste options
        try {
            editor.updateOptions({
                readOnly: false,
                domReadOnly: false,
                contextmenu: true,
                selectOnLineNumbers: true,
                dragAndDrop: true
            });
        } catch (e) {
            // Could not update editor options
        }

        // Hook keyboard events
        editor.onKeyDown(async (e) => {
            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            const isCtrlCmd = isMac ? e.metaKey : e.ctrlKey;

            // Copy: Ctrl/Cmd + C
            if (isCtrlCmd && e.keyCode === 67) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    // Try Monaco's built-in copy action first
                    editor.trigger('keyboard', 'editor.action.clipboardCopyAction');

                    // Fallback to manual selection copy
                    const selection = editor.getSelection();
                    if (selection && !selection.isEmpty()) {
                        const selectedText = editor.getModel().getValueInRange(selection);
                        await copyToClipboard(selectedText);
                    } else {
                        // Copy entire content if nothing selected
                        const allText = editor.getValue();
                        await copyToClipboard(allText);
                    }
                } catch (error) {
                    // Copy action failed
                }

                return false;
            }

            // Paste: Ctrl/Cmd + V
            if (isCtrlCmd && e.keyCode === 86) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    // Try Monaco's built-in paste action first
                    editor.trigger('keyboard', 'editor.action.clipboardPasteAction');

                    // Fallback to manual paste
                    const clipText = await pasteFromClipboard();
                    if (clipText) {
                        const selection = editor.getSelection();
                        editor.executeEdits('paste', [{
                            range: selection,
                            text: clipText
                        }]);
                    }
                } catch (error) {
                    // Paste action failed
                }

                return false;
            }

            // Select All: Ctrl/Cmd + A
            if (isCtrlCmd && e.keyCode === 65) {
                try {
                    editor.trigger('keyboard', 'editor.action.selectAll');
                } catch (error) {
                    // Select all failed
                }
            }
        });
    }

    // Detect and hook Monaco editors
    function detectAndHookMonaco() {
        if (monacoHooked) return;

        // Check if Monaco is available
        if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
            monacoHooked = true;

            // Hook existing editors
            try {
                const models = window.monaco.editor.getModels();
                models.forEach(model => {
                    const editors = window.monaco.editor.getEditors
                        ? window.monaco.editor.getEditors(model)
                        : [];
                    editors.forEach(hookMonacoEditor);
                });
            } catch (e) {
                // Could not hook existing editors
            }

            // Hook new editor creation
            const originalCreate = window.monaco.editor.create;
            window.monaco.editor.create = function(container, options = {}, ...args) {
                // Force enable copy-paste in options
                options.readOnly = false;
                options.domReadOnly = false;
                options.contextmenu = true;

                const editor = originalCreate.call(this, container, options, ...args);

                // Add delay to ensure editor is fully initialized
                setTimeout(() => hookMonacoEditor(editor), 100);

                return editor;
            };

            clipboardEnabled = true;
        }
    }

    // INITIALIZATION
    function initialize() {
        // Layer 1: Resilient cleanup and fallbacks
        injectSelectionCSS();
        blockEventListeners();
        setupDOMCleanup();

        // Layer 2: API-level hooks
        detectAndHookMonaco();
    }

    // Run immediately and on DOM changes
    initialize();

    // Multiple initialization points for reliability
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    }

    window.addEventListener('load', () => {
        setTimeout(initialize, 100);
        setTimeout(initialize, 500);
        setTimeout(initialize, 1000);
    });

    // Watch for dynamic Monaco loading
    const loadObserver = new MutationObserver(() => {
        if (!monacoHooked && typeof window.monaco !== 'undefined') {
            detectAndHookMonaco();
        }
    });

    loadObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Manual trigger for debugging
    window.enableMonacoClipboard = initialize;
    window.checkMonacoStatus = () => {
        return {
            monacoAvailable: typeof window.monaco !== 'undefined',
            hooksInstalled: monacoHooked,
            clipboardEnabled: clipboardEnabled
        };
    };

    // Emergency keyboard shortcut (Ctrl+Shift+M)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.keyCode === 77) {
            initialize();
        }
    });

})();
