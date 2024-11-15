export const humanizeTrackDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  return `${minutes.toString()}:${seconds.toString().padStart(2, "0")}`;
};

export const humanizeTotalDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours.toString()}h ${minutes}m`;
};

export const humanizeBigDuration = (seconds: number, padMinutes: boolean) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours.toString()} hours, ${
    padMinutes ? minutes.toString().padStart(2, "0") : minutes
  } minutes`;
};
