import { SCORES } from "@/lib/rating";

/** Skor seçimi. withKK: hükmen seçeneği (sadece lig sorumlusu), withEmpty: sonucu silme */
export function ScoreSelect({ defaultValue, withKK, withEmpty, className = "input w-auto" }: { defaultValue?: string; withKK?: boolean; withEmpty?: boolean; className?: string }) {
  return (
    <select name="score" defaultValue={defaultValue ?? ""} className={className} required={!withEmpty}>
      <option value="">{withEmpty ? "— Sonuç yok —" : "Skor seçin"}</option>
      {SCORES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
      {withKK && <option value="KK">Hükmen (ikisi de gelmedi)</option>}
    </select>
  );
}
