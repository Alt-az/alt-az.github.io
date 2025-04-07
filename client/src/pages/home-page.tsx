import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MedicationList from "@/pages/medication-list";
import ActivityPanel from "@/pages/activity-panel";
import { Medication } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();

  // Fetch medications
  const { 
    data: medications = [], 
    isLoading: isMedicationsLoading,
    error: medicationsError
  } = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
    enabled: !!user,
  });

  // Mark as taken mutation
  const markAsTakenMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/medications/${id}`, {
        status: "taken"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow container mx-auto p-6 flex flex-col md:flex-row gap-6">
        {/* Left Panel - Medication List */}
        <MedicationList 
          medications={medications} 
          isLoading={isMedicationsLoading}
          error={medicationsError}
          onMarkAsTaken={(id) => markAsTakenMutation.mutate(id)}
        />

        {/* Right Panel - Activity Feed */}
        <ActivityPanel />
      </main>

      <Footer />
    </div>
  );
}
