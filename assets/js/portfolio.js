(() => {
  const section = document.getElementById('works');
  const cards = [...section.querySelectorAll('.portfolio-card')];
  const dialog = document.getElementById('portfolio-dialog');
  const image = document.getElementById('portfolio-dialog-image');
  const title = document.getElementById('portfolio-dialog-title');
  const detail = document.getElementById('portfolio-dialog-detail');
  let selected = 0;
  const visible = () => cards.filter(card => !card.hidden);

  function show(index) {
    const items = visible();
    selected = (index + items.length) % items.length;
    const button = items[selected].querySelector('.portfolio-open');
    image.src = button.dataset.full;
    image.alt = button.querySelector('img').alt;
    title.textContent = button.querySelector('.portfolio-title').textContent;
    detail.textContent = button.querySelector('.portfolio-detail').textContent;
    document.getElementById('portfolio-dialog-count').textContent = `${selected + 1} / ${items.length}`;
  }

  section.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      section.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
      cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
      document.getElementById('portfolio-count').textContent = visible().length;
    });
  });
  cards.forEach(card => {
    card.querySelector('.portfolio-open').addEventListener('click', () => {
      show(visible().indexOf(card));
      dialog.showModal();
      document.documentElement.classList.add('portfolio-modal-open');
    });
  });
  document.getElementById('portfolio-close').addEventListener('click', () => dialog.close());
  document.getElementById('portfolio-prev').addEventListener('click', () => show(selected - 1));
  document.getElementById('portfolio-next').addEventListener('click', () => show(selected + 1));
  dialog.addEventListener('close', () => document.documentElement.classList.remove('portfolio-modal-open'));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  document.addEventListener('portfolio-language-change', () => { if (dialog.open) show(selected); });
})();
