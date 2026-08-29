export function createBus() {
  const handlers = new Map();
  return {
    on(type, fn) {
      let arr = handlers.get(type);
      if (!arr) handlers.set(type, (arr = []));
      arr.push(fn);
      return () => {
        const a = handlers.get(type);
        if (a) handlers.set(type, a.filter((f) => f !== fn));
      };
    },
    emit(type, payload) {
      const arr = handlers.get(type);
      if (arr) for (const fn of arr) fn(payload);
      const all = handlers.get("*");
      if (all) for (const fn of all) fn({ type, payload });
    },
  };
}
