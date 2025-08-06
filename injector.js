(function() {
    'use strict';

    let monacoHooked = false;
    let clipboardEnabled = false;
    let editorRegistry = new Map(); // Track all Monaco instances

    // Advanced CSS injection for text selection liberation
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

            .monaco-editor, .monaco-editor * {
                user-select: text !important;
                pointer-events: auto !important;
            }

            .textAreaCover {
               pointer-events: none !important;
            }

            ::selection {
                background: #b3d4fc !important;
                color: #000 !important;
            }

            ::-moz-selection {
                background: #b3d4fc !important;
                color: #000 !important;
            }

            ::shadow *, /deep/ * {
                user-select: text !important;
            }
        `;

        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        (document.head || document.documentElement).appendChild(style);
    }

    // Nuclear event listener blocking - complete override
    function blockEventListeners() {
        const blockedEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu'];
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (blockedEvents.includes(type.toLowerCase())) {
                return; // Nuclear block - no exceptions
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // Clear ALL existing handlers
        blockedEvents.forEach(event => {
            document['on' + event] = null;
            window['on' + event] = null;
        });
    }

    // Advanced clipboard operations with raw handling
    async function copyToClipboard(text) {
        if (!text) return false;

        try {
            // Modern Clipboard API (preferred)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {
            console.debug('Clipboard API failed, using nuclear fallback');
        }

        try {
            // Nuclear fallback with absolute formatting preservation
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            textarea.style.opacity = '0';
            textarea.style.whiteSpace = 'pre';
            textarea.style.fontFamily = 'monospace';
            textarea.style.fontSize = '12px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            textarea.setSelectionRange(0, text.length);

            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (e) {
            console.warn('Nuclear copy failed:', e);
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
            console.debug('Clipboard read failed:', e);
        }
        return '';
    }

    // Nuclear Solution 1: Complete DOM Text Extraction Bypass
    function extractCompleteTextFromDOM(editor) {
        try {
            const model = editor.getModel();
            if (!model) return '';

            // Method 1: Line-by-line extraction using Monaco's model (most reliable)
            const lineCount = model.getLineCount();
            const lines = [];
            
            for (let i = 1; i <= lineCount; i++) {
                const lineContent = model.getLineContent(i);
                lines.push(lineContent);
            }
            
            const completeText = lines.join('\n');
            console.log('✅ Nuclear DOM extraction successful:', completeText.length, 'characters');
            return completeText;
            
        } catch (error) {
            console.warn('Nuclear DOM extraction failed:', error);
            
            // Fallback: Raw DOM text extraction
            try {
                const editorDom = editor.getDomNode();
                const textLines = editorDom.querySelectorAll('.view-line');
                const extractedLines = [];
                
                textLines.forEach(line => {
                    const lineText = line.textContent || line.innerText || '';
                    extractedLines.push(lineText);
                });
                
                return extractedLines.join('\n');
            } catch (fallbackError) {
                console.warn('Fallback DOM extraction failed:', fallbackError);
                return '';
            }
        }
    }

    // Nuclear Solution 1: Extract Selected Text with Complete Token Awareness
    function extractSelectedTextFromDOM(editor) {
        try {
            const selection = editor.getSelection();
            const model = editor.getModel();
            
            if (!selection || !model) {
                return extractCompleteTextFromDOM(editor);
            }

            if (selection.isEmpty()) {
                return extractCompleteTextFromDOM(editor);
            }

            // Line-by-line extraction for selected range
            const startLine = selection.startLineNumber;
            const endLine = selection.endLineNumber;
            const startColumn = selection.startColumn;
            const endColumn = selection.endColumn;
            
            const lines = [];
            
            for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
                let lineContent = model.getLineContent(lineNum);
                
                // Handle partial line selection
                if (lineNum === startLine && lineNum === endLine) {
                    // Single line selection
                    lineContent = lineContent.substring(startColumn - 1, endColumn - 1);
                } else if (lineNum === startLine) {
                    // First line of multi-line selection
                    lineContent = lineContent.substring(startColumn - 1);
                } else if (lineNum === endLine) {
                    // Last line of multi-line selection
                    lineContent = lineContent.substring(0, endColumn - 1);
                }
                // Middle lines are included completely
                
                lines.push(lineContent);
            }
            
            const selectedText = lines.join('\n');
            console.log('✅ Nuclear selection extraction:', selectedText.length, 'characters');
            return selectedText;
            
        } catch (error) {
            console.warn('Nuclear selection extraction failed:', error);
            return extractCompleteTextFromDOM(editor);
        }
    }

    // Nuclear Solution 2: Complete Command System Override
    function overrideMonacoCommandSystem(editor) {
        try {
            // Nuclear approach: Override the entire keyboard service
            const keyboardService = editor._codeEditorService;
            const commandService = editor._commandService;
            
            // Block Monaco's command registration at source
            if (commandService && commandService.addCommand) {
                const originalAddCommand = commandService.addCommand;
                commandService.addCommand = function(command) {
                    // Block copy/paste related commands from Monaco
                    const blockedCommands = [
                        'editor.action.clipboardCopyAction',
                        'editor.action.clipboardCutAction', 
                        'editor.action.clipboardPasteAction',
                        'editor.action.selectAll'
                    ];
                    
                    if (blockedCommands.includes(command.id)) {
                        console.log('🚫 Blocked Monaco command:', command.id);
                        return; // Nuclear block
                    }
                    
                    return originalAddCommand.call(this, command);
                };
            }
            
            // Override editor's trigger method for nuclear control
            const originalTrigger = editor.trigger;
            editor.trigger = function(source, handlerId, payload) {
                const blockedHandlers = [
                    'editor.action.clipboardCopyAction',
                    'editor.action.clipboardCutAction',
                    'editor.action.clipboardPasteAction', 
                    'editor.action.selectAll'
                ];
                
                if (blockedHandlers.includes(handlerId)) {
                    console.log('🚫 Blocked Monaco trigger:', handlerId);
                    return; // Nuclear block
                }
                
                return originalTrigger.call(this, source, handlerId, payload);
            };
            
            console.log('✅ Nuclear command system override complete');
            
        } catch (error) {
            console.warn('Nuclear command override failed:', error);
        }
    }

    // Nuclear Solution 3: Raw Text Insertion with Zero Formatting
    function performRawTextInsertion(editor, textToInsert) {
        try {
            const model = editor.getModel();
            const selection = editor.getSelection();
            
            if (!model || !selection) return false;

            // Nuclear approach: Completely disable ALL Monaco formatting
            const originalOptions = {
                formatOnPaste: editor.getOption(monaco.editor.EditorOption.formatOnPaste),
                formatOnType: editor.getOption(monaco.editor.EditorOption.formatOnType),
                autoIndent: editor.getOption(monaco.editor.EditorOption.autoIndent),
                autoClosingBrackets: editor.getOption(monaco.editor.EditorOption.autoClosingBrackets),
                autoClosingQuotes: editor.getOption(monaco.editor.EditorOption.autoClosingQuotes),
                autoSurround: editor.getOption(monaco.editor.EditorOption.autoSurround),
                tabCompletion: editor.getOption(monaco.editor.EditorOption.tabCompletion)
            };

            // Nuclear disable ALL formatting
            editor.updateOptions({
                formatOnPaste: false,
                formatOnType: false,
                autoIndent: 'none',
                autoClosingBrackets: 'never',
                autoClosingQuotes: 'never', 
                autoSurround: 'never',
                tabCompletion: 'off'
            });

            // Perform nuclear raw insertion
            const edit = {
                range: selection,
                text: textToInsert,
                forceMoveMarkers: false
            };

            // Use pushEditOperations for direct model manipulation
            model.pushEditOperations([], [edit], () => []);

            // Calculate new cursor position manually
            const lines = textToInsert.split('\n');
            const newLineNumber = selection.startLineNumber + lines.length - 1;
            const newColumn = lines.length === 1 
                ? selection.startColumn + textToInsert.length
                : lines[lines.length - 1].length + 1;
                
            // Set position directly
            editor.setPosition({
                lineNumber: newLineNumber,
                column: newColumn
            });

            // Restore options after a longer delay to prevent interference
            setTimeout(() => {
                try {
                    editor.updateOptions(originalOptions);
                } catch (e) {
                    console.warn('Could not restore Monaco options:', e);
                }
            }, 500);

            console.log('✅ Nuclear raw insertion successful');
            return true;
            
        } catch (error) {
            console.warn('Nuclear raw insertion failed:', error);
            return false;
        }
    }

    // Nuclear Solution 4: Selection Range Hijacking
    function performNuclearFullSelection(editor) {
        try {
            const model = editor.getModel();
            if (!model) return false;

            // Method 1: Direct model range override
            const lineCount = model.getLineCount();
            const lastLineLength = model.getLineContent(lineCount).length;
            
            const fullRange = new monaco.Range(1, 1, lineCount, lastLineLength + 1);
            
            // Nuclear override: Force selection regardless of Monaco's state
            editor.setSelection(fullRange);
            
            // Double-ensure with focus
            editor.focus();
            
            // Triple-ensure with revision ID to force Monaco to acknowledge
            editor.revealRange(fullRange);
            
            console.log('✅ Nuclear full selection applied');
            return true;
            
        } catch (error) {
            console.warn('Nuclear full selection failed:', error);
            return false;
        }
    }

    // Nuclear Monaco Editor Hooking with Complete System Override
    function hookMonacoEditorNuclear(editor) {
        if (!editor || editor.__orangeNuclearHooked) return;
        editor.__orangeNuclearHooked = true;

        console.log('🍊 Nuclear Monaco hooking initiated');

        // Register editor in our tracking system
        const editorId = Date.now() + Math.random();
        editorRegistry.set(editorId, editor);

        // Get editor DOM node
        const editorDomNode = editor.getDomNode();
        if (!editorDomNode) return;

        // Nuclear Solution 2: Override Command System
        overrideMonacoCommandSystem(editor);

        // Nuclear keyboard event interception - complete override
        editorDomNode.addEventListener('keydown', async (e) => {
            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            const isCtrlCmd = isMac ? e.metaKey : e.ctrlKey;

            if (!isCtrlCmd) return; // Let Monaco handle non-command keys

            switch (e.key.toLowerCase()) {
                case 'a': // Select All - Nuclear Override
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    performNuclearFullSelection(editor);
                    break;

                case 'c': // Copy - Nuclear Override
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const textToCopy = extractSelectedTextFromDOM(editor);
                    if (textToCopy) {
                        await copyToClipboard(textToCopy);
                        console.log('✅ Nuclear copy:', textToCopy.length, 'chars');
                    }
                    break;

                case 'x': // Cut - Nuclear Override
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const selection = editor.getSelection();
                    if (selection && !selection.isEmpty()) {
                        const textToCut = extractSelectedTextFromDOM(editor);
                        if (textToCut) {
                            await copyToClipboard(textToCut);
                            
                            // Nuclear deletion using raw model operation
                            const model = editor.getModel();
                            model.pushEditOperations([], [{
                                range: selection,
                                text: ''
                            }], () => []);
                            
                            console.log('✅ Nuclear cut successful');
                        }
                    }
                    break;

                case 'v': // Paste - Nuclear Override
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const textToInsert = await pasteFromClipboard();
                    if (textToInsert) {
                        const success = performRawTextInsertion(editor, textToInsert);
                        if (success) {
                            console.log('✅ Nuclear paste:', textToInsert.length, 'chars');
                        }
                    }
                    break;

                default:
                    // Let Monaco handle other commands
                    break;
            }
        }, { 
            capture: true,
            passive: false
        });

        // Nuclear event blocking for copy/paste events
        ['copy', 'cut', 'paste'].forEach(eventType => {
            editorDomNode.addEventListener(eventType, (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                // Events are handled by keydown listener
            }, { 
                capture: true,
                passive: false
            });
        });

        // Configure Monaco for minimal interference
        try {
            editor.updateOptions({
                readOnly: false,
                domReadOnly: false,
                contextmenu: true,
                selectOnLineNumbers: true,
                dragAndDrop: true,
                copyWithSyntaxHighlighting: false,
                formatOnPaste: false,
                formatOnType: false,
                autoIndent: 'none',
                autoClosingBrackets: 'never',
                autoClosingQuotes: 'never',
                autoSurround: 'never'
            });
        } catch (e) {
            console.warn('Could not configure Monaco options:', e);
        }

        clipboardEnabled = true;
        console.log('🎉 Nuclear Monaco integration complete');
    }

    // Nuclear Monaco Detection and Hooking
    function detectAndHookMonacoNuclear() {
        if (monacoHooked) return;

        if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
            monacoHooked = true;
            console.log('🔍 Monaco detected - beginning nuclear integration');

            // Hook existing editors
            try {
                if (window.monaco.editor.getEditors) {
                    window.monaco.editor.getEditors().forEach(hookMonacoEditorNuclear);
                }
            } catch (e) {
                console.warn('Error hooking existing editors:', e);
            }

            // Nuclear override of editor creation
            const originalCreate = window.monaco.editor.create;
            window.monaco.editor.create = function(container, options = {}, ...args) {
                // Force nuclear-friendly options
                options.formatOnPaste = false;
                options.formatOnType = false;
                options.autoIndent = 'none';
                options.copyWithSyntaxHighlighting = false;

                const editor = originalCreate.call(this, container, options, ...args);
                
                // Nuclear hook with delay
                setTimeout(() => hookMonacoEditorNuclear(editor), 200);
                
                return editor;
            };

            // Also override diff editor creation
            if (window.monaco.editor.createDiffEditor) {
                const originalCreateDiff = window.monaco.editor.createDiffEditor;
                window.monaco.editor.createDiffEditor = function(container, options = {}, ...args) {
                    const diffEditor = originalCreateDiff.call(this, container, options, ...args);
                    
                    setTimeout(() => {
                        try {
                            const originalEditor = diffEditor.getOriginalEditor();
                            const modifiedEditor = diffEditor.getModifiedEditor();
                            if (originalEditor) hookMonacoEditorNuclear(originalEditor);
                            if (modifiedEditor) hookMonacoEditorNuclear(modifiedEditor);
                        } catch (e) {
                            console.warn('Error hooking diff editors:', e);
                        }
                    }, 200);
                    
                    return diffEditor;
                };
            }

            console.log('🎯 Nuclear Monaco hooks installed');
        }
    }

    // Master initialization function
    function initializeNuclear() {
        console.log('🍊 Orange Nuclear Monaco Liberator initializing...');
        
        // Layer 1: Complete DOM liberation
        injectSelectionCSS();
        blockEventListeners();

        // Layer 2: Nuclear Monaco integration
        detectAndHookMonacoNuclear();
        
        console.log('✅ Nuclear initialization complete');
    }

    // Multi-stage nuclear initialization
    initializeNuclear();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNuclear);
    }

    window.addEventListener('load', () => {
        setTimeout(initializeNuclear, 100);
        setTimeout(initializeNuclear, 500);
        setTimeout(initializeNuclear, 1000);
        setTimeout(initializeNuclear, 2000);
        setTimeout(initializeNuclear, 5000); // Extended delay for complex sites
    });

    // Continuous Monaco detection
    const nuclearObserver = new MutationObserver(() => {
        if (!monacoHooked && typeof window.monaco !== 'undefined') {
            detectAndHookMonacoNuclear();
        }
    });

    nuclearObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Debug functions
    window.enableMonacoClipboard = initializeNuclear;
    window.checkMonacoStatus = () => {
        return {
            monacoAvailable: typeof window.monaco !== 'undefined',
            hooksInstalled: monacoHooked,
            clipboardEnabled: clipboardEnabled,
            editorsTracked: editorRegistry.size,
            version: 'NUCLEAR-4.0',
            features: [
                'Complete DOM Bypass',
                'Nuclear Command Override',
                'Raw Text Insertion',
                'Selection Range Hijacking',
                'Line-by-Line Processing',
                'Zero Monaco Interference'
            ]
        };
    };

    // Emergency nuclear reset
    window.nuclearReset = () => {
        console.log('💥 NUCLEAR RESET INITIATED');
        monacoHooked = false;
        editorRegistry.clear();
        initializeNuclear();
    };

    // Emergency activation
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.keyCode === 77) {
            console.log('🚨 Emergency nuclear re-initialization');
            window.nuclearReset();
        }
    });

    console.log('🍊💥 Orange Nuclear Monaco Liberator v4.0 LOADED - ALL SYSTEMS BYPASSED');
})();
