import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import PDV from './pages/PDV'
import Produtos from './pages/Produtos'
import Historico from './pages/Historico'
import Relatorio from './pages/Relatorio'
import Estatisticas from './pages/Estatisticas'
import ListaCompras from './pages/ListaCompras'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route element={<Layout />}>
          <Route path="dia" element={<PDV />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="historico" element={<Historico />} />
          <Route path="relatorio" element={<Relatorio />} />
          <Route path="estatisticas" element={<Estatisticas />} />
          <Route path="lista-compras" element={<ListaCompras />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
