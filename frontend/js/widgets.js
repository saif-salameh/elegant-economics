// Widget registry and loader
const widgets = {};

export function registerWidget(conceptId, initFunction) {
    widgets[conceptId] = initFunction;
}

export function loadWidget(conceptId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (widgets[conceptId]) {
        widgets[conceptId](container);
    } else {
        // Attempt to dynamically load a module named after the concept (replace dashes with underscores)
        const moduleName = conceptId.replace(/-/g, '_');
        import(`./${moduleName}.js`).then(mod => {
            if (mod && typeof mod.init === 'function') {
                mod.init(container);
            } else {
                container.innerHTML = '<p>No interactive widget available for this concept.</p>';
            }
        }).catch(() => {
            container.innerHTML = '<p>No interactive widget available for this concept.</p>';
        });
    }
}
