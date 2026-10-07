import type { Match } from "./service";

const formats = { FIVE: "Fútbol 5", SIX: "Fútbol 6", SEVEN: "Fútbol 7" };
const dateFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const priceFormat = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function MatchCard({ match }: { match: Match }) {
  const available = match.availablePlaces > 0;
  return (
    <article className="match">
      <time dateTime={match.startsAt}>{dateFormat.format(new Date(match.startsAt))}</time>
      <h2>{match.venueName}</h2>
      <p>{formats[match.footballType]} · {match.location.name}</p>
      <p className="muted">{match.address}</p>
      <p>{priceFormat.format(Number(match.pricePerPerson))} por persona</p>
      <p className={available ? "available" : "muted"}>
        {available
          ? `${match.availablePlaces} ${match.availablePlaces === 1 ? "lugar disponible" : "lugares disponibles"}`
          : "Partido completo"}
      </p>
      {match.description ? <p className="muted">{match.description}</p> : null}
    </article>
  );
}
