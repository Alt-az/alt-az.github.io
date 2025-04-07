import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, User } from "lucide-react";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-primary text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Heart className="h-8 w-8" />
          <h1 className="text-xl font-bold">PGF Assistant</h1>
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setLocation("/")}
              className="hover:underline flex items-center space-x-1"
            >
              <span>My Account</span>
              <User className="h-5 w-5" />
            </button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="hover:underline text-white"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
