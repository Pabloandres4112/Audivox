// src/routes/AppRoutes.tsx

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Ejemplo de carga perezosa (puedes descomentar y usar cuando tengas los componentes)
// const LandingDesarrollador = lazy(() => import('./components/Pages/landing/landing-Job-Desarrollador'));
// const NotFound = lazy(() => import('./components/page/NotFound'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <Routes>
        {/* <Route path="/" element={<LandingDesarrollador />} /> */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
