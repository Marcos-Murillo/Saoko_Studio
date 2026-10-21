'use client'
import { Mail, CalendarClock, FileText, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const IDEAS = [
  {
    title: 'Recordatorio de mensualidad',
    when: 'Unos días antes del vencimiento, o cuando el mes sigue pendiente.',
    to: 'Bailarín o acudiente, si hay correo cargado.',
  },
  {
    title: 'Aviso de horario o inasistencia',
    when: 'Cuando la academia quiera avisar un cambio de clase.',
    to: 'Los bailarines del grupo afectado.',
  },
  {
    title: 'Evento o ensayo',
    when: 'Antes de una presentación, con fecha, lugar y lo que deben llevar.',
    to: 'Inscritos en el evento o en el grupo.',
  },
  {
    title: 'Cumpleaños',
    when: 'El día del cumpleaños, si se decide automatizarlo.',
    to: 'El bailarín o su acudiente.',
  },
]

export default function CorreosPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <PageHeader
        title="Correos"
        description="Vista previa. Todavía no se envía ningún correo: falta la plantilla de la academia y la lista de mensajes que quieren automatizar."
      />

      <Card style={{ background: 'rgba(232,160,48,.08)', border: '1px solid rgba(232,160,48,.35)' }}>
        <CardContent className="p-5 flex gap-3">
          <Mail size={18} className="shrink-0 mt-0.5" style={{ color: '#e8a030' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Esto es solo la revisión de cómo quedaría</p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Saoko ya guarda el correo del bailarín. Para programar envíos hace falta definir el diseño del mensaje
              (logo, colores, firma y textos) y cuáles avisos se mandan solos. Hasta que eso esté claro, esta pantalla no dispara correos.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
              Cómo se implementaría
            </p>
            <ol className="flex flex-col gap-4">
              {[
                { icon: FileText, title: 'Plantilla', text: 'Un diseño único de la academia. Los datos del bailarín, el grupo y la fecha se rellenan solos dentro de ese diseño.' },
                { icon: CalendarClock, title: 'Programación', text: 'Una tarea diaria en Firebase (Cloud Scheduler) revisa quién debe recibir el aviso y deja el correo en cola. El envío lo haría un servicio como Resend o la extensión Trigger Email de Firebase.' },
                { icon: Users, title: 'Esta pantalla', text: 'Aquí se elegirían los mensajes activos, a quién van y se vería el historial: enviado, fallido o pendiente. Nada de eso está conectado todavía.' },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ background: 'rgba(201,168,76,.12)' }}>
                    <Icon size={16} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</p>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--gold)' }}>
              Mensajes posibles
            </p>
            <div className="flex flex-col gap-3">
              {IDEAS.map(item => (
                <div key={item.title} className="rounded-xl p-4" style={{ background: 'var(--accent)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{item.title}</p>
                    <Badge variant="outline" style={{ color: '#e8a030', borderColor: 'rgba(232,160,48,.4)', fontSize: '0.68rem' }}>
                      Por definir
                    </Badge>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{item.when}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Destino: {item.to}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
