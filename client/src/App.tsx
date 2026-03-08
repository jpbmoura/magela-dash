import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Vendas from "./pages/Vendas";
import Estoque from "./pages/Estoque";
import Produtos from "./pages/Produtos";
import Equipe from "./pages/Equipe";
import AtualizarBase from "./pages/AtualizarBase";

function Router() {
  return (
    <Switch>
      {/* Redirect root to dashboard */}
      <Route path={"/"}>
        {() => <Redirect to="/dashboard" />}
      </Route>

      {/* Dashboard routes */}
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/clientes"}>
        {() => (
          <DashboardLayout>
            <Clientes />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/vendas"}>
        {() => (
          <DashboardLayout>
            <Vendas />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/estoque"}>
        {() => (
          <DashboardLayout>
            <Estoque />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/produtos"}>
        {() => (
          <DashboardLayout>
            <Produtos />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/equipe"}>
        {() => (
          <DashboardLayout>
            <Equipe />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/atualizar-base"}>
        {() => (
          <DashboardLayout>
            <AtualizarBase />
          </DashboardLayout>
        )}
      </Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
