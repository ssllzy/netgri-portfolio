// All participating scroll effects read layout before any of them writes styles.
window.NetgriFrame = (() => {
  const jobs = new Map();
  let frame = 0;
  const flush = () => {
    frame = 0;
    const batch = [...jobs.values()];
    jobs.clear();
    const values = batch.map(job => job.read());
    batch.forEach((job, index) => job.write(values[index]));
  };
  return { schedule(key, read, write) {
    jobs.set(key, { read, write });
    if (!frame) frame = requestAnimationFrame(flush);
  } };
})();
