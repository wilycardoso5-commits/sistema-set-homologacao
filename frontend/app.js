async function consultarHealth() {
    const output = document.getElementById('json-output');
    const codeEl = document.getElementById('http-code');
    const btn = document.getElementById('btn-refresh');
    const dot = document.getElementById('dot-status');
    const badgeText = document.getElementById('badge-text');
    
    if (btn) btn.disabled = true;
    if (output) output.innerText = "Consultando /api/health...";
    
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        // Substitui o texto pelos dados retornados pela API
        if (output) output.innerText = JSON.stringify(data, null, 2);
        if (codeEl) codeEl.innerText = `HTTP ${response.status} OK`;

        // Indicador muda para VERDE quando status === "ok" e database === "conectado"
        if (data.status === 'ok' && data.database === 'conectado') {
            if (dot) {
                dot.style.backgroundColor = '#10b981';
                dot.style.boxShadow = '0 0 10px #10b981';
            }
            if (codeEl) codeEl.style.color = '#10b981';
            if (badgeText) badgeText.innerText = 'Sistema Online & Banco Conectado';
        } else if (data.database === 'desconectado' || data.status === 'degradado') {
            if (dot) {
                dot.style.backgroundColor = '#f59e0b';
                dot.style.boxShadow = '0 0 10px #f59e0b';
            }
            if (codeEl) codeEl.style.color = '#f59e0b';
            if (badgeText) badgeText.innerText = 'Sistema Degradado (Banco Desconectado)';
        } else {
            if (dot) {
                dot.style.backgroundColor = '#ef4444';
                dot.style.boxShadow = '0 0 10px #ef4444';
            }
            if (codeEl) codeEl.style.color = '#ef4444';
            if (badgeText) badgeText.innerText = 'Status Indefinido';
        }
    } catch (err) {
        if (codeEl) {
            codeEl.innerText = 'Falha na Conexão';
            codeEl.style.color = '#ef4444';
        }
        if (dot) {
            dot.style.backgroundColor = '#ef4444';
            dot.style.boxShadow = '0 0 10px #ef4444';
        }
        if (badgeText) badgeText.innerText = 'Servidor Indisponível';
        
        if (output) {
            output.innerText = JSON.stringify({
                status: "erro",
                mensagem: "Não foi possível conectar ao servidor em /api/health",
                detalhes: err.message
            }, null, 2);
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Event Listeners sem scripts inline ou onclick
window.addEventListener('DOMContentLoaded', () => {
    consultarHealth();
    
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', consultarHealth);
    }
});
