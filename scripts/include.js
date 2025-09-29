// Simple HTML include loader
(async function() {
    const includes = document.querySelectorAll('[data-include]');
    await Promise.all(Array.from(includes).map(async (el) => {
        const url = el.getAttribute('data-include');
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.statusText);
            el.innerHTML = await res.text();
            el.querySelectorAll('script').forEach(old => {
                const s = document.createElement('script');
                if (old.src) s.src = old.src;
                else s.textContent = old.textContent;
                document.body.appendChild(s);
                old.remove();
            });
        } catch (err) {
            console.error('Include failed:', url, err);
            el.innerHTML = `<!-- include failed: ${url} -->`;
        }
    }));
    // beri tahu sisa aplikasi bahwa includes sudah siap
    window.dispatchEvent(new Event('includesLoaded'));
})();