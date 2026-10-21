import type { ElementType } from 'react'
import {
  CalendarDays, DollarSign, LayoutDashboard, Mail, Settings, Shirt, Ticket, Users, UsersRound,
} from 'lucide-react'

export type ProductPoint = { title: string; text: string }

export type ProductModule = {
  slug: string
  name: string
  summary: string
  lead: string
  icon: ElementType
  points: ProductPoint[]
}

export const PRODUCT_MODULES: ProductModule[] = [
  {
    slug: 'inicio',
    name: 'Inicio',
    summary: 'El resumen del estudio',
    icon: LayoutDashboard,
    lead: 'El inicio junta en una sola vista lo que dirección necesita para saber cómo va la academia este mes.',
    points: [
      { title: 'Bailarines activos', text: 'Ves cuántas personas siguen en grupo y el estado de la cuota: al día, con deuda o con saldo a favor.' },
      { title: 'Caja del periodo', text: 'Lo recaudado, los gastos y el balance se leen juntos. La gráfica compara ingresos de caja y gastos de los últimos seis meses.' },
      { title: 'Filtro de fechas', text: 'El mismo rango recorre el panel, así el resumen y los reportes hablan del mismo periodo.' },
    ],
  },
  {
    slug: 'bailarines',
    name: 'Bailarines',
    summary: 'Ficha, acudiente y grupo',
    icon: Users,
    lead: 'Cada bailarín tiene una ficha propia. Desde ahí se ve quién es, con quién se habla y en qué grupo está.',
    points: [
      { title: 'Datos de la persona', text: 'Nombre, documento, edad, foto, categoría y si sigue activo. Se busca por nombre, cédula o grupo.' },
      { title: 'Acudiente', text: 'El contacto de la familia queda en la misma ficha, junto al correo que la academia guarda para avisos.' },
      { title: 'Situación del mes', text: 'La ficha muestra si la mensualidad está pagada, parcial, en deuda o con saldo a favor.' },
    ],
  },
  {
    slug: 'grupos',
    name: 'Grupos',
    summary: 'Clases e instructores',
    icon: UsersRound,
    lead: 'Un grupo reúne a quienes toman la misma clase, con su instructor, modalidad y nivel.',
    points: [
      { title: 'Quién está dentro', text: 'Ves los bailarines del grupo y puedes entrar a la ficha de cada uno.' },
      { title: 'Instructor', text: 'El grupo queda asociado a quien da la clase. El instructor consulta sus grupos sin entrar a la caja.' },
      { title: 'Catálogo de la academia', text: 'Modalidad, categoría y nivel salen de los catálogos que configura dirección.' },
    ],
  },
  {
    slug: 'horarios',
    name: 'Horarios',
    summary: 'La semana de clases',
    icon: CalendarDays,
    lead: 'El horario muestra la semana del estudio: qué grupo ensaya, a qué hora, en qué salón y con qué instructor.',
    points: [
      { title: 'Calendario semanal', text: 'Cada clase tiene día, hora, lugar e instructor. El cambio queda escrito en un solo lugar.' },
      { title: 'Por grupo', text: 'Se ve la clase en el contexto del grupo, no como una nota suelta.' },
      { title: 'Lo que ve el instructor', text: 'Quien da la clase consulta sus horarios. No necesita ver mensualidades ni deudas.' },
    ],
  },
  {
    slug: 'caja',
    name: 'Caja',
    summary: 'Mensualidades, gastos y reportes',
    icon: DollarSign,
    lead: 'La caja del estudio lleva la mensualidad, los abonos, las deudas, los saldos y los gastos. El dinero de un festival no entra aquí.',
    points: [
      { title: 'Cuota congelada', text: 'Al inscribir, la mensualidad guarda el valor de ese momento. Un cambio de tarifa no reescribe el mes pasado.' },
      { title: 'Abonos y saldos', text: 'Un pago puede cubrir varias cuotas, quedar parcial o dejar saldo a favor. Anularlo pide un motivo y deshace el reparto.' },
      { title: 'Gastos y reportes', text: 'Cada gasto tiene categoría, método y comprobante. El periodo sale en PDF o Excel con ingresos, gastos y balance.' },
    ],
  },
  {
    slug: 'eventos',
    name: 'Eventos',
    summary: 'Festivales, aparte de la mensualidad',
    icon: Ticket,
    lead: 'Un festival vive en su propia caja: fecha, pase completo, categorías e inscripciones.',
    points: [
      { title: 'Pase y categorías', text: 'El pase completo cubre el festival. Cada categoría puede tener su propio precio, o no tener costo.' },
      { title: 'Inscripción', text: 'La inscripción suma lo que corresponde, registra abonos y cierra en pendiente, parcial o pagada.' },
      { title: 'Dinero separado', text: 'Esos pagos no entran a la contabilidad mensual de la academia. Las estadísticas del evento se leen ahí mismo.' },
    ],
  },
  {
    slug: 'vestuario',
    name: 'Vestuario',
    summary: 'Préstamo y devolución',
    icon: Shirt,
    lead: 'El vestuario es un inventario. Cada prenda se puede prestar, y se ve si ya volvió.',
    points: [
      { title: 'La prenda', text: 'Registras nombre, código y talla. El panel cuenta cuántas hay, cuántas están prestadas y cuántas vencieron.' },
      { title: 'A quién se presta', text: 'El préstamo queda a nombre de un bailarín, con fecha de salida y fecha límite.' },
      { title: 'La devolución', text: 'Cuando la prenda regresa, se marca como devuelta. Si la fecha pasó y sigue afuera, queda vencida.' },
    ],
  },
  {
    slug: 'correos',
    name: 'Correos',
    summary: 'Avisos que la academia prepara',
    icon: Mail,
    lead: 'El correo del bailarín se guarda en la ficha. Los avisos se pueden dejar listos; el envío automático todavía no sale.',
    points: [
      { title: 'Contacto guardado', text: 'La dirección queda junto a la persona, lista para mensualidad, cambio de clase, evento o cumpleaños.' },
      { title: 'Borrador', text: 'Puedes armar el aviso y revisarlo antes. Hoy es una vista previa, no un envío.' },
      { title: 'Sin envío solo', text: 'Nexora no manda correos por su cuenta. La academia decide cuándo esa parte entra en uso.' },
    ],
  },
  {
    slug: 'ajustes',
    name: 'Ajustes',
    summary: 'Quién entra y cómo se cobra',
    icon: Settings,
    lead: 'Dirección configura el estudio: usuarios, roles y los catálogos que usan el resto de las secciones.',
    points: [
      { title: 'Usuarios', text: 'No hay registro público. Dirección crea las cuentas y asigna instructor, administrativo o administrador.' },
      { title: 'Catálogos', text: 'Modalidades, categorías, niveles, métodos de pago y tipos de gasto se definen una vez y se usan en toda la academia.' },
      { title: 'Membrete e historial', text: 'El membrete de los PDF se arma aquí. Los cambios de usuarios y roles quedan en el historial.' },
    ],
  },
]

export function getProduct(slug: string) {
  return PRODUCT_MODULES.find((item) => item.slug === slug)
}
