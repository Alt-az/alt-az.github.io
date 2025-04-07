import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import { ProtectedRoute } from "./lib/protected-route";
import ChatAssistant from "./components/chat-assistant";
import { AuthProvider } from "./hooks/use-auth";

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Switch>
          <ProtectedRoute path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
        <ChatAssistant />
      </div>
    </AuthProvider>
  );
}

export default App;
