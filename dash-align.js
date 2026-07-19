function alignDashCards() {
  const layouts = document.querySelectorAll('.dash-layout');
  layouts.forEach(layout => {
    const cols = layout.querySelectorAll('.col');
    if (cols.length === 0) return;

    let maxHeight = 0;
    cols.forEach(col => {
      col.style.height = '';
      const height = col.offsetHeight;
      if (height > maxHeight) maxHeight = height;
    });

    cols.forEach(col => {
      col.style.height = maxHeight + 'px';
      const cards = col.querySelectorAll('.card');
      if (cards.length > 0) {
        cards.forEach((card, index) => {
          if (index === cards.length - 1) {
            const otherCardsHeight = Array.from(cards).slice(0, -1).reduce((sum, card) => sum + card.offsetHeight, 0);
            const gapHeight = (cards.length - 1) * 16;
            const remainingHeight = maxHeight - otherCardsHeight - gapHeight - 32;
            if (remainingHeight > 0) {
              card.style.minHeight = remainingHeight + 'px';
              card.style.display = 'flex';
              card.style.flexDirection = 'column';
              const content = card.querySelector('.bar-list, .list, .donuts, .facts, .scroll-list, #detailContent, #foodIndex, #pointList, #rangerDetail');
              if (content) {
                content.style.flexGrow = '1';
                content.style.overflowY = 'auto';
                content.style.minHeight = '0';
              }
            }
          } else {
            card.style.minHeight = '';
            card.style.display = '';
            card.style.flexDirection = '';
          }
        });
      }
    });
  });
}

window.addEventListener('load', alignDashCards);
window.addEventListener('resize', alignDashCards);