(function() {
    console.log('⚓ Athena Dock Connector v7 Active');

    let lastKnownData = null;
    const getApiUrl = (path) => {
        const base = import.meta.env.BASE_URL || '/';
        return (base + '/' + path).replace(new RegExp('/+', 'g'), '/');
    };

    const themeMappings = {
        'primary_color': ['--color-primary', '--primary-color'],
        'title_color': ['--color-title'],
        'heading_color': ['--color-heading'],
        'accent_color': ['--color-accent'],
        'button_color': ['--color-button', '--color-button-bg', '--btn-bg'],
        'card_color': ['--color-card', '--bg-surface', '--color-card-bg', '--card-bg', '--surface', '--color-surface'],
        'header_color': ['--color-header', '--bg-header', '--color-header-bg', '--nav-bg'],
        'bg_color': ['--color-background', '--bg-site'],
        'text_color': ['--color-text']
    };

    const globalMappings = {
        'global_radius': '--radius-custom',
        'hero_overlay_opacity': '--hero-overlay-opacity',
        'header_height': '--header-height',
        'content_top_offset': '--content-top-offset'
    };

    function scanSections() {
        const sections = [];
        document.querySelectorAll('[data-dock-section]').forEach(el => {
            sections.push(el.getAttribute('data-dock-section'));
        });
        return sections;
    }

    function notifyDock(fullData = null) {
        if (fullData) lastKnownData = fullData;
        const structure = {
            sections: scanSections(),
            layouts: lastKnownData?.layout_settings?.[0] || lastKnownData?.layout_settings || {},
            data: lastKnownData || {},
            url: window.location.href,
            timestamp: Date.now()
        };
        window.parent.postMessage({ type: 'SITE_READY', structure }, '*');
    }

    window.addEventListener('message', async (event) => {
        const { type, key, value, section, direction, file, index } = event.data;

        if (type === 'DOCK_UPDATE_COLOR') {
            const root = document.documentElement;
            const isDark = root.classList.contains('dark');
            const currentTheme = isDark ? 'dark' : 'light';
            
            if (key === 'theme') {
                if (value === 'dark') { root.classList.add('dark'); root.style.colorScheme = 'dark'; }
                else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
                return;
            }

            if (globalMappings[key]) {
                const finalVal = (key === 'header_height' || key === 'content_top_offset') ? (value + 'px') : value;
                root.style.setProperty(globalMappings[key], finalVal);
                return;
            }

            const targetTheme = key.startsWith('dark') ? 'dark' : 'light';
            const cleanKey = key.replace('light_', '').replace('dark_', '');
            
            if (targetTheme === currentTheme && themeMappings[cleanKey]) {
                themeMappings[cleanKey].forEach(v => root.style.setProperty(v, value));
            }
        }

        if (type === 'DOCK_SWAP_STYLE') setTimeout(() => window.location.reload(), 500);

        if (type === 'DOCK_UPDATE_TEXT') {
            const bindStr = JSON.stringify({ file, index, key });
            const elements = document.querySelectorAll('[data-dock-bind]');
            const baseUrl = import.meta.env.BASE_URL || '/';

            elements.forEach(el => {
                try {
                    const elBind = JSON.parse(el.getAttribute('data-dock-bind'));
                    if (elBind.file !== file || elBind.index !== index || elBind.key !== key) return;

                    const dockType = el.getAttribute('data-dock-type') || (el.tagName === 'IMG' ? 'media' : 'text');
                    if (dockType === 'media') {
                        const src = (value && !value.startsWith('http') && !value.startsWith('/') && !value.startsWith('data:'))
                            ? `${baseUrl}images/${value}`.replace(/\/+/g, '/')
                            : value;
                        const mediaEl = (el.tagName === 'IMG' || el.tagName === 'VIDEO') ? el : el.querySelector('img, video');
                        if (mediaEl) mediaEl.src = src;
                    } else if (dockType === 'link') {
                        const { label, url } = (typeof value === 'object' && value !== null) ? value : { label: value, url: '' };
                        el.innerText = label || '';
                        el.setAttribute('data-dock-label', label || '');
                        el.setAttribute('data-dock-url', url || '');
                    } else {
                        el.innerText = value;
                    }
                } catch(e) {}
            });
        }
    });

    if (document.readyState === 'complete') setTimeout(notifyDock, 1000);
    else window.addEventListener('load', () => setTimeout(notifyDock, 1000));

    window.athenaScan = notifyDock;
})();