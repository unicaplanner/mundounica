const SAO_PAULO = "America/Sao_Paulo";

export function getGreeting(now: Date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: SAO_PAULO,
    }).format(now)
  );

  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return {
    greeting,
    dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
  };
}
