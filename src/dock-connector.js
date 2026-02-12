/**
 * ⚓ Athena Dock Connector v6 (Universal)
 * Handles communication between the generated site (iframe) and the Athena Dock (parent).
 */
(function() {
    console.log("⚓ Athena Dock Connector v6 Active");

    // --- 1. CONFIGURATION & STATE ---
    let lastKnownData = null;

    const getApiUrl = (path) => {
        // Detecteer het basispad dynamisch. 
        // Bijv: /fpc-gent-site/index.html -> /fpc-gent-site/
        const pathParts = window.location.pathname.split('/');
        // Het basispad is meestal het eerste deel (bijv. de projectnaam)
        const base = pathParts.length > 1 ? '/' + pathParts[1] + '/' : '/';
        
        const fullPath = (base + '/' + path).replace(/\/+/g, '/');
        return window.location.origin + fullPath;
    };

    // --- 2. SECTION SCANNER ---
    function scanSections() {
        const sections = [];
        const sectionElements = document.querySelectorAll('[data-dock-section]');
        sectionElements.forEach(el => {
            sections.push(el.getAttribute('data-dock-section'));
        });
        return sections;
    }

    // --- 3. COMMUNICATION (OUTBOUND) ---
    function notifyDock(fullData = null) {
        if (fullData) lastKnownData = fullData;
        
        // Get current relative path
        let currentPath = '/';
        if (window.location.hash) {
            currentPath = window.location.hash.replace('#', '') || '/';
        } else {
            const base = import.meta.env.BASE_URL || '/';
            currentPath = window.location.pathname.replace(base, '') || '/';
        }

        const structure = {
            sections: scanSections(),
            layouts: lastKnownData?.layout_settings?.[0] || lastKnownData?.layout_settings || {},
            data: lastKnownData || {},
            url: window.location.href,
            currentPath: currentPath,
            timestamp: Date.now()
        };

        window.parent.postMessage({
            type: 'SITE_READY',
            structure: structure
        }, '*');
        
        console.log(`📨 Sent SITE_READY to Dock (Path: ${currentPath})`);
    }

    // Notify Dock on internal navigation
    window.addEventListener('hashchange', () => notifyDock());

    // --- 4. COMMUNICATION (INBOUND) ---
    window.addEventListener('message', async (event) => {
        const { type, key, value, section, direction, file, index } = event.data;

        // Color Update
        if (type === 'DOCK_UPDATE_COLOR') {
            console.log(`🎨 Updating color: ${key} -> ${value}`);
            
            const isDark = document.documentElement.classList.contains('dark');
            let targetVar = key.replace('light_', '').replace('dark_', '').replace('_color', '');
            if (targetVar === 'bg') targetVar = 'background';
            
            if (key === 'theme') {
                console.log("🌓 Switching theme to:", value);
                const isDark = value === 'dark';
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                }
                return;
            }

            const mode = key.startsWith('dark') ? 'dark' : 'light';
            if ((mode === 'dark' && isDark) || (mode === 'light' && !isDark)) {
                document.documentElement.style.setProperty(`--color-${targetVar}`, value);
            }
        }

        // Section Movement
        if (type === 'DOCK_MOVE_SECTION') {
            console.log(`↔️ Moving section: ${section} (${direction})`);
        }

        // Text Update (Live Preview)
        if (type === 'DOCK_UPDATE_TEXT') {
            const bindStr = JSON.stringify({ file, index, key });
            const elements = document.querySelectorAll(`[data-dock-bind='${bindStr}']`);
            elements.forEach(el => {
                if (value !== undefined) el.innerText = value;
                
                // Apply formatting if provided
                if (event.data.formatting) {
                    const f = event.data.formatting;
                    if (f.bold !== undefined) el.style.fontWeight = f.bold ? 'bold' : 'normal';
                    if (f.italic !== undefined) el.style.fontStyle = f.italic ? 'italic' : 'normal';
                    if (f.fontSize) el.style.fontSize = f.fontSize;
                    if (f.textAlign) el.style.textAlign = f.textAlign;
                    if (f.fontFamily) el.style.fontFamily = f.fontFamily === 'inherit' ? '' : f.fontFamily;
                }
            });
        }

        // Navigation (MPA Support)
        if (type === 'ATHENA_NAVIGATE') {
            const { path } = event.data.payload;
            console.log("✈️ Navigating to:", path);
            
            // If the site uses React Router HashRouter (standard for our MPA)
            if (window.location.hash !== undefined) {
                // Ensure path starts with /
                const cleanPath = path.startsWith('/') ? path : '/' + path;
                window.location.hash = '#' + cleanPath;
            } else {
                // Fallback for standard routing
                const base = import.meta.env.BASE_URL || '/';
                const targetPath = (base + '/' + path).replace(new RegExp('/+', 'g'), '/');
                window.location.href = targetPath;
            }
        }
    });

    // --- 5. INITIALIZATION ---
    if (document.readyState === 'complete') {
        setTimeout(notifyDock, 1000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(notifyDock, 1000);
        });
    }

    window.athenaScan = notifyDock;

    // --- 6. DRAG & DROP FUNCTIONALITY ---
    
    // Inject CSS for Drop Zones
    const style = document.createElement('style');
    style.innerHTML = `
        [data-dock-bind] { cursor: context-menu; }
        
        /* Global Drag State: Disable generic pointers to allow drop-through */
        body.dock-dragging-active * {
            pointer-events: none !important;
        }
        
        /* Highlight Targets & Re-enable pointers */
        /* Increased specificity to override body.dock-dragging-active * */
        body.dock-dragging-active .dock-image-drop-target {
            outline: 4px dashed #3b82f6 !important;
            outline-offset: -4px;
            position: relative; 
            z-index: 9999 !important;
            pointer-events: auto !important; /* Make sure we can drop on it */
            transition: all 0.2s;
        }
        
        .dock-image-drop-target::after {
            content: 'Drop Image';
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #3b82f6; color: white; padding: 4px 12px; border-radius: 999px;
            font-size: 12px; font-weight: bold; pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .dock-image-drop-target:hover {
            background-color: rgba(59, 130, 246, 0.1);
            transform: scale(1.02);
        }
    `;
    document.head.appendChild(style);

    const isImageBind = (bind) => {
        if (!bind || !bind.key) return false;
        const k = bind.key.toLowerCase();
        return k.includes('foto') || k.includes('image') || k.includes('img') || k.includes('afbeelding') || k.includes('hero_image');
    };

    let dragEnterCount = 0;

    const toggleDropZones = (active) => {
        if (active) document.body.classList.add('dock-dragging-active');
        else document.body.classList.remove('dock-dragging-active');

        const elements = document.querySelectorAll('[data-dock-bind]');
        elements.forEach(el => {
            try {
                const bind = JSON.parse(el.getAttribute('data-dock-bind'));
                if (isImageBind(bind)) {
                    if (active) el.classList.add('dock-image-drop-target');
                    else el.classList.remove('dock-image-drop-target');
                }
            } catch(e) {}
        });
    };

    // Global Drag Tracking
    window.addEventListener('dragenter', (e) => {
        // Simplified check
        dragEnterCount++;
        if (dragEnterCount === 1) {
            toggleDropZones(true);
        }
    });

    window.addEventListener('dragleave', (e) => {
        dragEnterCount--;
        if (dragEnterCount <= 0) {
            dragEnterCount = 0;
            toggleDropZones(false);
        }
    });

    window.addEventListener('dragover', (e) => {
        // Necessary to allow dropping
        if (document.body.classList.contains('dock-dragging-active')) {
            e.preventDefault();
        }
    });

    window.addEventListener('drop', async (e) => {
        const target = e.target.closest('[data-dock-bind]');
        
        // Reset state
        dragEnterCount = 0;
        toggleDropZones(false);

        if (!target) return; // Drop outside target

        const bind = JSON.parse(target.getAttribute('data-dock-bind'));
        if (!isImageBind(bind)) return;

        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        const droppedUrl = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('url');

        // CASE 1: File Upload
        if (file && file.type.startsWith('image/')) {
            console.log("⚓ Dock Drop: Uploading file", file.name);
            const originalOpacity = target.style.opacity;
            target.style.opacity = '0.5';
            
            try {
                const uploadRes = await fetch(getApiUrl('__athena/upload'), {
                    method: 'POST',
                    headers: { 'x-filename': file.name },
                    body: file
                });
                const uploadData = await uploadRes.json();
                
                if (uploadData.success) {
                    await updateValue(bind, uploadData.filename, target);
                }
            } catch (err) {
                console.error("❌ Drop upload failed:", err);
                alert("Upload failed. Make sure site is on port 4000.");
            } finally {
                target.style.opacity = originalOpacity || '1';
            }
        } 
        // CASE 2: URL Drop (from another window)
        else if (droppedUrl && (droppedUrl.startsWith('http') || droppedUrl.includes('/images/'))) {
            console.log("⚓ Dock Drop: Processing URL", droppedUrl);
            let finalValue = droppedUrl;
            if (droppedUrl.includes('/images/')) {
                finalValue = droppedUrl.split('/images/').pop().split('?')[0];
            }
            await updateValue(bind, finalValue, target);
        }
        else {
            alert("Please drop an image file or a valid image URL.");
        }

    }, true);

    async function updateValue(bind, value, targetEl) {
        // 1. Update JSON
        await fetch(getApiUrl('__athena/update-json'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: bind.file,
                index: bind.index,
                key: bind.key,
                value: value
            })
        });

        // 2. Update DOM (Optimistic UI)
        const displayUrl = value.startsWith('http') ? value : getApiUrl(`images/${value}?t=${Date.now()}`);
        if (targetEl.tagName === 'IMG') {
            targetEl.src = displayUrl;
        } else {
            targetEl.style.backgroundImage = `url(${displayUrl})`;
        }
        
        // 3. Trigger Dock Refresh
        window.parent.postMessage({ type: 'DOCK_TRIGGER_REFRESH' }, '*');
    }

    // Click event for selection (Inline Editing)
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-dock-bind]');
        if (target && window.parent !== window) {
            if (e.shiftKey) return;

            e.preventDefault();
            e.stopPropagation();

            const binding = JSON.parse(target.getAttribute('data-dock-bind'));
            const dockType = target.getAttribute('data-dock-type') || (
                (binding.key && (binding.key.toLowerCase().includes('foto') || 
                                 binding.key.toLowerCase().includes('image') || 
                                 binding.key.toLowerCase().includes('img') || 
                                 binding.key.toLowerCase().includes('afbeelding') || 
                                 binding.key.toLowerCase().includes('video'))) ? 'media' : 'text'
            );

            let currentValue = target.getAttribute('data-dock-current') || target.innerText;
            
            if (dockType === 'link') {
                currentValue = {
                    label: target.getAttribute('data-dock-label') || target.innerText,
                    url: target.getAttribute('data-dock-url') || ""
                };
            } else if (!currentValue || dockType === 'media') {
                const img = target.tagName === 'IMG' ? target : target.querySelector('img');
                if (img) {
                    const src = img.getAttribute('src');
                    if (src && src.includes('/images/')) {
                        currentValue = src.split('/images/').pop().split('?')[0];
                    } else {
                        currentValue = src;
                    }
                }
            }

            window.parent.postMessage({
                type: 'SITE_CLICK',
                binding: binding,
                currentValue: currentValue || "",
                tagName: target.tagName,
                dockType: dockType
            }, '*');
        }
    }, true);

})();