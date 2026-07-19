document.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('page-enter');
  setTimeout(function() {
    document.body.classList.remove('page-enter');
  }, 1000);
});