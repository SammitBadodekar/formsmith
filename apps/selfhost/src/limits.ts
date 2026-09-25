export function requestLimit(maximum = 120, now = Date.now) {
  const windows = new Map<string, { count: number; expires: number }>();
  let swept = 0;
  return (key: string) => {
    const time = now();
    if (time - swept >= 60000) {
      for (const [name, entry] of windows) if (entry.expires <= time) windows.delete(name);
      swept = time;
    }
    let entry = windows.get(key);
    if (!entry || entry.expires <= time) {
      if (!entry && windows.size >= 10000) return false;
      entry = { count: 0, expires: time + 60000 };
      windows.set(key, entry);
    }
    return ++entry.count <= maximum;
  };
}
