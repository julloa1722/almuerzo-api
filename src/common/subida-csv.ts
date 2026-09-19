import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Opciones para las subidas de CSV de colaboradores.
 *
 * Sprint 20: antes los cuatro `FileInterceptor('file')` corrían con los
 * defaults de multer, que **no traen límite de tamaño**. Mientras todo era
 * localhost daba igual; con la API pública en un contenedor de 512 MB, subir
 * un archivo grande basta para tumbar el servicio — sin autenticarse como
 * nadie especial, solo siendo un RRHH cualquiera.
 *
 * 2 MB son unas 20.000 filas de nómina, muy por encima de cualquier empresa
 * que este sistema vaya a ver. El motor de importación además ya valida el
 * contenido (`src/back-office/importar-colaboradores.ts`); esto solo evita
 * que un archivo absurdo llegue siquiera a memoria.
 */
export const OPCIONES_CSV: MulterOptions = {
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
};
