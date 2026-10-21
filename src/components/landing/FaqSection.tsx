'use client'

import { useState } from 'react'
import Link from 'next/link'

const QUESTIONS = [
  {
    q: '¿Puedo registrar el préstamo de un vestuario?',
    a: (
      <>
        Sí. Registras la prenda y a quién se la prestaste, con fecha de salida y fecha límite.
        También ves si ya la devolvió o si el préstamo está vencido.{' '}
        <Link href="/producto/vestuario">Ver vestuario</Link>
      </>
    ),
  },
  {
    q: '¿Qué pasa con la mensualidad si cambio la tarifa?',
    a: (
      <>
        La cuota guarda el valor del momento de la inscripción. Subir la tarifa no reescribe lo que ya se cobró.{' '}
        <Link href="/producto/caja">Ver caja</Link>
      </>
    ),
  },
  {
    q: '¿Puedo recibir un abono y dejar saldo a favor?',
    a: (
      <>
        Sí. Un pago puede cubrir varias cuotas, quedar parcial o generar saldo a favor.
        Si hay que anularlo, el sistema pide un motivo y deshace el reparto.{' '}
        <Link href="/producto/caja">Ver cómo se reparte un pago</Link>
      </>
    ),
  },
  {
    q: '¿El dinero de un festival entra a la caja del mes?',
    a: (
      <>
        No. El evento tiene su pase completo, sus categorías y sus inscripciones.
        Esos abonos no se mezclan con la contabilidad mensual de la academia.{' '}
        <Link href="/producto/eventos">Ver eventos</Link>
      </>
    ),
  },
  {
    q: '¿Puedo saber quién debe y quién está al día?',
    a: (
      <>
        Sí. El inicio resume bailarines activos, deudas, saldos, lo recaudado, los gastos y el balance.
        La gráfica compara seis meses y el periodo se exporta en PDF o Excel.{' '}
        <Link href="/producto/inicio">Ver el inicio</Link>
      </>
    ),
  },
  {
    q: '¿El instructor ve los pagos?',
    a: (
      <>
        No. El instructor consulta el día, sus grupos y sus horarios.
        Administrativo lleva personas, caja y escenario. Dirección crea usuarios y catálogos.{' '}
        <Link href="/producto/horarios">Ver horarios</Link>
      </>
    ),
  },
  {
    q: '¿Puedo dejar armada la semana de clases?',
    a: (
      <>
        Sí. Cada clase tiene día, hora, salón e instructor, ligada a su grupo.{' '}
        <Link href="/producto/horarios">Ver la semana</Link>
      </>
    ),
  },
  {
    q: '¿Los correos se envían solos?',
    a: (
      <>
        Todavía no. El correo del bailarín queda guardado y el aviso se puede preparar.
        El envío automático no sale de Nexora.{' '}
        <Link href="/producto/correos">Ver correos</Link>
      </>
    ),
  },
]

export function FaqSection() {
  const [open, setOpen] = useState(0)
  const mid = Math.ceil(QUESTIONS.length / 2)
  const columns = [QUESTIONS.slice(0, mid), QUESTIONS.slice(mid)]

  return (
    <div className="nx-faq">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="nx-faq-col">
          {column.map((item, index) => {
            const id = columnIndex === 0 ? index : index + mid
            const on = open === id
            return (
              <div key={item.q} className="nx-faq-item" data-open={on ? 'true' : undefined}>
                <button type="button" aria-expanded={on} onClick={() => setOpen(on ? -1 : id)}>
                  <span>{item.q}</span>
                  <i aria-hidden>{on ? '–' : '+'}</i>
                </button>
                <div className="nx-faq-panel">
                  <p>{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
