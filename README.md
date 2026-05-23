# GastosFlow 📈

**GastosFlow** es una aplicación web premium y responsiva para el control de finanzas personales, gestión de presupuestos mensuales y control de deudas/préstamos. La aplicación se ejecuta completamente en el navegador y utiliza `localStorage` para garantizar la privacidad y velocidad de tus datos sin necesidad de bases de datos externas.

---

## Características Principales

### 1. Dashboard Financiero e Historial
* **Resumen Financiero**: Tarjetas interactivas que muestran tu Balance Total, Ingresos y Egresos.
* **Gráficos Estadísticos**: 
  * Distribución de gastos en un gráfico circular de dona.
  * Tendencia histórica de Ingresos vs. Gastos mensual de los últimos 6 meses (Bar Chart).
* **Filtros Avanzados**: Búsqueda en tiempo real, filtros por tipo (Ingresos/Gastos), categorías y rangos de fecha (Este mes, Mes anterior, 7 días, 30 días, Todo).

### 2. Control de Presupuestos
* **Presupuesto Global**: Establece un límite de gasto mensual general.
* **Presupuestos por Categoría**: Define topes mensuales específicos (ej. Comida, Transporte).
* **Alertas Visuales**: La barra de progreso cambia a color amarillo al superar el **80%** de tu presupuesto y a rojo al alcanzar o superar el **100%**, disparando alertas toast instantáneas.

### 3. Gestor de Deudas y Préstamos
* **Doble Registro**: Administra el dinero que debes (**Por Pagar**) y el que te deben (**Por Cobrar**).
* **Abonos Parciales**: Registra pagos fraccionados hacia cualquier deuda, viendo el progreso en tiempo real con barras de avance.
* **Vinculación Contable**: Opción de registrar automáticamente cada abono como una transacción real en tu Dashboard.
* **Estado de Vencimiento**: Alertas automáticas para deudas cuya fecha límite ya haya expirado.

### 4. Personalización y Herramientas de Datos
* **Temas Visuales**: Alternador entre Tema Oscuro (Slate premium por defecto) y Tema Claro.
* **Multimoneda**: Soporte para cambio de divisa en la aplicación (MXN `$`, EUR `€`, GBP `£`, etc.).
* **Gestión de Categorías**: Añade categorías personalizadas eligiendo nombre, color de tarjeta y un catálogo de iconos modernos.
* **Copias de Seguridad**: 
  * Exporta e importa tus datos en formato JSON para transferirlos a otros dispositivos.
  * Descarga reportes completos de transacciones en formato CSV compatibles con Excel.

---

## Tecnologías Utilizadas

* **Estructura**: HTML5 Semántico.
* **Diseño**: CSS3 (Variables CSS, Flexbox, Grid, Glassmorphism, animaciones personalizadas).
* **Lógica**: Vanilla JavaScript (ES Modules nativos del navegador, patrón Pub/Sub para reactividad simple).
* **Herramientas de Gráficos**: [Chart.js](https://www.chartjs.org/) (vía CDN).
* **Iconografía**: [Lucide Icons](https://lucide.dev/) (vía CDN).
* **Servidor de Desarrollo**: [Vite](https://vitejs.dev/) para un Hot Module Replacement (HMR) ultra rápido.

---

## Instrucciones para Ejecución Local

Sigue estos pasos para instalar y ejecutar el proyecto en tu entorno local:

### Requisitos Previos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

### 1. Descargar Dependencias
Instala los paquetes necesarios (Vite) ejecutando en la terminal:
```bash
npm install
```

### 2. Iniciar el Servidor de Desarrollo
Corre el servidor local de desarrollo:
```bash
npm run dev
```
La aplicación estará disponible de inmediato en tu navegador en:
👉 **[http://localhost:5173/](http://localhost:5173/)**

### 3. Compilar para Producción
Para empaquetar y optimizar la aplicación web lista para ser subida a cualquier hosting estático (Netlify, Vercel, GitHub Pages), ejecuta:
```bash
npm run build
```
Los archivos optimizados se generarán dentro de la carpeta `dist/`.
