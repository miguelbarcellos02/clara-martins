# Clara Martins — Portfolio

Site estático (HTML, CSS e JavaScript, sem build), publicado pelo GitHub Pages.

- `index.html`: todo o texto e a lista de imagens de cada seção.
- `style.css`: visual (preto e branco, fonte DM Sans).
- `main.js`: animação do nome, menu, tiras laterais, parede do sketchbook (posições e fios) e visualização ampliada.
- `img/<seção>/`: cada foto tem uma versão grande (`nome.jpg`) e uma miniatura (`nome-s.jpg`).

## Como editar

- **Texto:** edite direto no `index.html`.
- **Nova foto numa tira:** coloque `nova.jpg` (até ~1800px) e `nova-s.jpg` (~720px) na pasta da seção e copie uma linha `<img ...>` da mesma tira, trocando nomes, `width`/`height` e `alt`.
- **Contato:** no `index.html`, procure `EMAIL_DA_CLARA`, coloque o e-mail e tire os comentários (`<!--` e `-->`) em volta.
- **Parede do sketchbook:** as posições ficam em `layouts` no `main.js` (x, y e largura em % da parede; o último número é a inclinação).

Qualquer alteração enviada para a branch `main` vai ao ar em cerca de um minuto.
