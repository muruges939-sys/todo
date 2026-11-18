export default function ProfileAvatar({ name = "", photo = "", className = "" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initial}
    </span>
  );
}
