// Original implementation inspired by the public Word Loader preview:
// https://21st.dev/@chetanverma16/components/word-loader
window.createWordLoader = (element, words) => {
  const accessible = document.createElement('span');
  accessible.className = 'sr-only';
  accessible.textContent = words[0];
  const stack = document.createElement('span');
  stack.className = 'word-loader-stack';
  stack.setAttribute('aria-hidden', 'true');
  words.forEach((word, wordIndex) => {
    const row = document.createElement('span');
    row.className = 'word-loader-row';
    Array.from(word).forEach((letter, letterIndex) => {
      const character = document.createElement('span');
      character.className = 'word-loader-char';
      character.textContent = letter;
      character.style.animationDelay = `${wordIndex * 3 + letterIndex * .035}s`;
      row.append(character);
    });
    stack.append(row);
  });
  element.style.setProperty('--word-cycle', `${words.length * 3}s`);
  element.replaceChildren(accessible, stack);
};
