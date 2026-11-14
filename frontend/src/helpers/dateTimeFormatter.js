export default function dateTimeFormatter(date) {
  return new Date(date).toLocaleString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
