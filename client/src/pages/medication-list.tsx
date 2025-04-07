import { useState } from "react";
import { ChevronDown, AlertCircle, CheckCircle, PillIcon } from "lucide-react";
import { Medication } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MedicationListProps {
  medications: Medication[];
  isLoading: boolean;
  error: Error | null;
  onMarkAsTaken: (id: number) => void;
}

export default function MedicationList({ medications, isLoading, error, onMarkAsTaken }: MedicationListProps) {
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Filter medications based on selected filter
  const filteredMedications = medications.filter((med) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "due") return med.status === "upcoming" && new Date(med.nextDueAt as string).getDate() === new Date().getDate();
    if (activeFilter === "overdue") return med.status === "overdue";
    if (activeFilter === "upcoming") return med.status === "upcoming";
    return true;
  });

  // Get upcoming medications for the special section
  const upcomingMedications = medications.filter(
    (med) => med.status === "upcoming" && new Date(med.nextDueAt as string).getTime() < new Date().getTime() + 24 * 60 * 60 * 1000
  );

  return (
    <div className="w-full md:w-2/3 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-secondary text-white p-4">
        <h2 className="text-lg font-semibold">Medication Overview</h2>
      </div>
      
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={() => setActiveFilter("all")}
            variant={activeFilter === "all" ? "default" : "outline"}
            className={`rounded-full text-sm ${activeFilter === "all" ? "" : "bg-white border border-gray-200"}`}
          >
            All Medications
          </Button>
          <Button
            onClick={() => setActiveFilter("due")}
            variant={activeFilter === "due" ? "default" : "outline"}
            className={`rounded-full text-sm ${activeFilter === "due" ? "" : "bg-white border border-gray-200"}`}
          >
            Due Today
          </Button>
          <Button
            onClick={() => setActiveFilter("overdue")}
            variant={activeFilter === "overdue" ? "default" : "outline"}
            className={`rounded-full text-sm ${activeFilter === "overdue" ? "" : "bg-white border border-gray-200"}`}
          >
            Overdue
          </Button>
          <Button
            onClick={() => setActiveFilter("upcoming")}
            variant={activeFilter === "upcoming" ? "default" : "outline"}
            className={`rounded-full text-sm ${activeFilter === "upcoming" ? "" : "bg-white border border-gray-200"}`}
          >
            Upcoming
          </Button>
        </div>
      </div>
      
      {upcomingMedications.length > 0 && (
        <div className="p-4 bg-blue-50 border-l-4 border-primary">
          <div 
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-primary font-semibold">Upcoming Medications</h3>
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {upcomingMedications.length}
              </span>
            </div>
            <ChevronDown 
              className={`text-gray-500 transition-transform ${isUpcomingExpanded ? 'rotate-180' : ''}`} 
            />
          </div>
          
          {isUpcomingExpanded && (
            <div className="mt-3 space-y-2">
              {upcomingMedications.map((medication) => (
                <div key={medication.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-primary p-2 rounded-md">
                      <PillIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{medication.name}</div>
                      <div className="text-sm text-gray-500">{medication.dosage}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-primary px-3 py-1 rounded-full text-sm">
                      {new Date(medication.nextDueAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Button 
                      onClick={() => onMarkAsTaken(medication.id)}
                      size="icon"
                      className="bg-green-500 hover:bg-green-600 h-8 w-8 rounded-full"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="overflow-auto max-h-[500px]">
        {isLoading ? (
          // Loading skeletons
          <div className="divide-y divide-gray-200">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading medications</h3>
            <p className="text-gray-500">{error.message}</p>
          </div>
        ) : filteredMedications.length === 0 ? (
          // Empty state
          <div className="p-8 text-center">
            <PillIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medications found</h3>
            <p className="text-gray-500">
              {activeFilter === "all" 
                ? "You don't have any medications added yet."
                : `No medications match the "${activeFilter}" filter.`}
            </p>
          </div>
        ) : (
          // Medication list
          <div className="divide-y divide-gray-200">
            {filteredMedications.map((medication) => (
              <div 
                key={medication.id} 
                className={`p-4 flex justify-between items-center ${
                  medication.status === "overdue" 
                    ? "bg-orange-50" 
                    : medication.hasInteraction 
                    ? "bg-purple-50"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${
                    medication.medicationType === "prescription" 
                      ? "bg-blue-100 text-primary" 
                      : "bg-green-100 text-green-600"
                  }`}>
                    <PillIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{medication.name}</div>
                    <div className="text-sm text-gray-500">{medication.dosage}</div>
                    
                    {/* Alert indicators */}
                    {(medication.supplyRemaining && medication.supplyRemaining < 10) || medication.hasInteraction ? (
                      <div className="mt-2 flex gap-1">
                        {medication.supplyRemaining && medication.supplyRemaining < 10 && (
                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Low Supply
                          </span>
                        )}
                        
                        {medication.hasInteraction && (
                          <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Interaction
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    medication.status === "taken" 
                      ? "bg-green-100 text-green-700" 
                      : medication.status === "overdue" 
                      ? "bg-orange-100 text-orange-700" 
                      : "bg-blue-100 text-primary"
                  }`}>
                    {medication.status === "taken" 
                      ? "Taken" 
                      : medication.status === "overdue" 
                      ? "Overdue" 
                      : "Upcoming"}
                  </span>
                  
                  {medication.status !== "taken" && (
                    <Button 
                      onClick={() => onMarkAsTaken(medication.id)}
                      size="icon"
                      className="bg-green-500 hover:bg-green-600 h-8 w-8 rounded-full"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
