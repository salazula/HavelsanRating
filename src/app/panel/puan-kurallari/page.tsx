import { requireUser } from "@/lib/auth";
import { getRules, rulesInfo } from "@/lib/rules";
import { DEFAULT_RULES, tableLabel, type Rules } from "@/lib/rating";
import { formatDateTime } from "@/lib/labels";
import { PanelTitle } from "@/components/panel-title";
import { ActionForm, Field } from "@/components/forms/action-form";
import { resetRules, saveRules } from "./actions";

type Key = Exclude<keyof Rules, "table">;

const SECTIONS: { title: string; fields: [Key, string, string?][] }[] = [
  {
    title: "Katılım ve gelmeme",
    fields: [
      [
        "declaredAbsentPenalty",
        "Katılamayacağını bildiren",
        "Son güne kadar 'katılamayacağım' diyen oyuncu",
      ],
      [
        "undeclaredPenalty",
        "Katılım bildirmeyen (hükmen)",
        "Son güne kadar hiç bildirim yapmayan oyuncu",
      ],
      ["noMatchPenalty", "Katıldığı halde hiç maç yapamayan"],
    ],
  },
  {
    title: "Hafta sonu ek puanlar",
    fields: [
      [
        "expectedMatches",
        "Beklenen maç sayısı",
        "Bundan az maç yapana eksik maç bonusu verilir",
      ],
      ["perMissingMatch", "Eksik maç başına"],
      ["unbeatenBonus", "Haftanın yıldızı", "Tüm maçlarını kazanan oyuncu"],
    ],
  },
  {
    title: "Set averajı ve hükmen",
    fields: [
      ["setBonus30", "3-0 kazanana"],
      ["setBonus31", "3-1 kazanana"],
      ["setBonus32", "3-2 kazanana"],
      [
        "walkoverSetPenalty",
        "Hükmen ek cezası",
        "Hükmende yüksek puanlıya ek ceza; iki oyuncunun set averajından da düşülür",
      ],
    ],
  },
];

const EXTRA_ROWS = 2;

export default async function RulesSettingsPage() {
  await requireUser(["SUPER_ADMIN", "LEAGUE_MANAGER"]);
  const [rules, info] = await Promise.all([getRules(), rulesInfo()]);
  const rows = [
    ...rules.table,
    ...Array.from({ length: EXTRA_ROWS }, () => null),
  ];

  return (
    <>
      <PanelTitle
        title="Puan kuralları"
        subtitle={
          info
            ? `Son değişiklik: ${info.updatedBy ?? "?"} · ${formatDateTime(info.updatedAt)}`
            : "Excel’deki varsayılan değerler kullanılıyor."
        }
      />
      <p className="mb-6 max-w-3xl text-sm text-ink-soft">
        Değişiklikler kapanmamış haftaların hesabına hemen yansır. Kapanmış
        haftalar, kapandıkları andaki kurallarla kalır. Varsayılan değerler gri
        olarak gösterilir.
      </p>

      <ActionForm
        action={saveRules}
        submitLabel="Kuralları kaydet"
        className="space-y-6"
      >
        {/* key: kayıttan sonra alanlar yeni değerlerle yeniden çizilsin */}
        <div
          key={info?.updatedAt.toISOString() ?? "default"}
          className="space-y-6"
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <section key={s.title} className="card space-y-3 p-5">
                <h2 className="font-bold">{s.title}</h2>
                {s.fields.map(([key, label, hint]) => (
                  <Field
                    key={key}
                    label={label}
                    hint={
                      hint
                        ? `${hint} · varsayılan ${DEFAULT_RULES[key]}`
                        : `Varsayılan ${DEFAULT_RULES[key]}`
                    }
                  >
                    <input
                      name={key}
                      type="number"
                      required
                      defaultValue={rules[key]}
                      className="input"
                    />
                  </Field>
                ))}
              </section>
            ))}
          </div>

          <section className="card overflow-hidden">
            <div className="border-b border-line bg-table-50/60 px-4 py-3">
              <h2 className="font-bold">Puan farkı tablosu</h2>
              <p className="text-xs text-ink-soft">
                Satır eklemek için boş satırları doldurun, silmek için satırı
                tamamen boşaltın. Son satırın üst sınırı yoktur (“ve üzeri”).
              </p>
            </div>
            <input type="hidden" name="rows" value={rows.length} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold tracking-wide text-ink-soft uppercase">
                    <th className="px-4 py-2">Puan farkı</th>
                    <th className="px-4 py-2">Üst sınır</th>
                    <th className="px-4 py-2">Yüksek puanlı kazanırsa</th>
                    <th className="px-4 py-2">Düşük puanlı kazanırsa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r, i) => {
                    const d = DEFAULT_RULES.table[i];
                    return (
                      <tr key={i}>
                        <td className="px-4 py-2 font-semibold whitespace-nowrap">
                          {r ? (
                            tableLabel(rules.table, i)
                          ) : (
                            <span className="text-ink-soft">Yeni satır</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            name={`max_${i}`}
                            type="number"
                            min={0}
                            defaultValue={
                              r && Number.isFinite(r.max) ? r.max : ""
                            }
                            placeholder={r ? "ve üzeri" : ""}
                            className="input w-28"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            name={`high_${i}`}
                            type="number"
                            min={0}
                            defaultValue={r?.high ?? ""}
                            className="input w-24"
                          />
                          {d && (
                            <span className="ml-2 text-xs text-ink-soft">
                              {d.high}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            name={`low_${i}`}
                            type="number"
                            min={0}
                            defaultValue={r?.low ?? ""}
                            className="input w-24"
                          />
                          {d && (
                            <span className="ml-2 text-xs text-ink-soft">
                              {d.low}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </ActionForm>

      {info && (
        <div className="mt-8 border-t border-line pt-6">
          <ActionForm
            action={resetRules}
            submitLabel="Excel’deki varsayılanlara dön"
            submitClass="btn-ghost"
            confirm="Tüm puan kuralları varsayılan değerlere dönsün mü?"
          >
            <span />
          </ActionForm>
        </div>
      )}
    </>
  );
}
