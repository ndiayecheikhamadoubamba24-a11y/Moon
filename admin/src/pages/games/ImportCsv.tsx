import Papa from 'papaparse'
import { CheckCircle2, CloudUpload, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Button, Modal, Notice, Table } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'

type Row = Record<string, string>
type Result = { rows: { line: number; errors: string[]; type: string | null; prompt: string; topic: string | null }[]; valid: number; invalid: number }

const TEMPLATE = 'type;enonce;theme;options;reponse;explication;difficulte\nquiz;Peut-on faire du sport pendant les règles ?;Corps et cycle;Oui|Non|Seulement le matin;A;Le sport peut soulager les crampes.;facile\nmythe;Le cycle dure toujours 28 jours.;Mythes;;mythe;Il varie de 21 à 35 jours.;facile\n'

/** Import CSV en 3 étapes : fichier, vérification, import des lignes valides. */
export default function ImportCsv({ open, onClose, onDone, endpoint = '/admin/questions/import', template = TEMPLATE, filename = 'modele-questions.csv' }: { open: boolean; onClose: () => void; onDone: () => void; endpoint?: string; template?: string; filename?: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [check, setCheck] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => (setRows([]), setCheck(null), setError(''), setDone(null))
  const close = () => (reset(), onClose())

  const onFile = (file: File) => {
    reset()
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
      complete: async (res) => {
        setRows(res.data)
        setBusy(true)
        try {
          setCheck(await api<Result>(`${endpoint}?dry_run=1`, { method: 'POST', body: { rows: res.data } }))
        } catch (e) {
          setError(errorMessage(e))
        } finally {
          setBusy(false)
        }
      },
      error: (e) => setError(e.message),
    })
  }

  const importValid = async () => {
    setBusy(true)
    try {
      const valid = rows.filter((_, i) => !check?.rows[i]?.errors.length)
      const r = await api<Result>(endpoint, { method: 'POST', body: { rows: valid } })
      setDone(r.valid)
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8' }))
    a.download = filename
    a.click()
  }

  return (
    <Modal open={open} onClose={close} title="Import CSV" wide>
      <ol className="mb-4 flex gap-4 text-sm font-bold">
        <li className={!check ? 'text-pink' : 'text-muted'}>1. Fichier</li>
        <li className={check && done === null ? 'text-pink' : 'text-muted'}>2. Prévisualisation</li>
        <li className={done !== null ? 'text-pink' : 'text-muted'}>3. Import</li>
      </ol>
      {done !== null ? (
        <Notice tone="mint" icon={<CheckCircle2 className="size-4" />}>
          {done} ligne(s) importée(s) en statut « En relecture ». Active-les après vérification.
        </Notice>
      ) : !check ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-lilac p-10 text-center hover:bg-lavender-soft">
          <CloudUpload className="size-10 text-purple" />
          <span className="font-black">Glisse-dépose ton fichier CSV ici ou clique pour le sélectionner</span>
          <span className="text-xs text-muted">Séparateur « ; » ou « , ». Options de quiz séparées par « | ».</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <button type="button" onClick={(e) => (e.preventDefault(), downloadTemplate())} className="mt-2 text-sm font-bold text-purple underline">
            Télécharger le modèle CSV
          </button>
        </label>
      ) : (
        <>
          <p className="mb-2 text-sm font-bold">Prévisualisation ({Math.min(rows.length, 10)} premières lignes)</p>
          <Table head={['Ligne', 'Énoncé / nom', 'Statut']}>
            {check.rows.slice(0, 10).map((r) => (
              <tr key={r.line}>
                <td className="px-3 py-2">{r.line}</td>
                <td className="px-3 py-2">{r.prompt || (r as unknown as { name: string }).name || '—'}</td>
                <td className="px-3 py-2">
                  {r.errors.length ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-danger">
                      <XCircle className="size-4" /> {r.errors.join(' ')}
                    </span>
                  ) : (
                    <CheckCircle2 className="size-5 text-mint" />
                  )}
                </td>
              </tr>
            ))}
          </Table>
          {check.invalid > 0 && (
            <div className="mt-3">
              <Notice tone="danger">{check.invalid} ligne(s) avec erreurs : elles ne seront pas importées.</Notice>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Choisir un autre fichier
            </Button>
            <Button onClick={importValid} loading={busy} disabled={!check.valid}>
              Importer les {check.valid} ligne(s) valide(s)
            </Button>
          </div>
        </>
      )}
      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </Modal>
  )
}
