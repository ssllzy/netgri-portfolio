document.querySelectorAll('.works-face img').forEach(img => {
  const face = img.closest('.works-face');
  const ready = () => {
    face.classList.remove('media-pending');
    face.classList.toggle('media-error', !img.naturalWidth);
  };
  if (img.complete) ready();
  else {
    face.classList.add('media-pending');
    img.addEventListener('load', ready, { once: true });
    img.addEventListener('error', ready, { once: true });
  }
});
