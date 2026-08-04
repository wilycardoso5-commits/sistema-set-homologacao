const { app, BrowserWindow } = require("electron");
const path = require("path");

function criarJanela() {
  const janela = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    title: "Sistema SET São Luís",
    icon: path.join(__dirname, "icone.ico")
  });

  janela.loadFile("login.html");
}

app.whenReady().then(criarJanela);

app.on("window-all-closed", () => {
  app.quit();
});