import { useQuery } from "@tanstack/react-query";
import { Activity } from "@shared/schema";
import { Loader2, AlertCircle } from "lucide-react";

export default function ActivityPanel() {
  // Fetch activities
  const { 
    data: activities = [], 
    isLoading,
    error
  } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Helper to format dates
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Helper to get border color based on activity type
  const getBorderColor = (type: string) => {
    switch (type) {
      case "medication_taken":
        return "border-green-500";
      case "low_supply":
        return "border-orange-500";
      case "appointment_scheduled":
        return "border-blue-500";
      case "medication_interaction":
        return "border-purple-500";
      case "prescription_refilled":
        return "border-green-500";
      default:
        return "border-gray-500";
    }
  };

  return (
    <div className="w-full md:w-1/3 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-secondary text-white p-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
      </div>
      
      <div className="p-4 max-h-[700px] overflow-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-gray-500">Failed to load activities</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activities to display</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`border-l-4 ${getBorderColor(activity.activityType)} pl-3 py-2`}
              >
                <div className="font-medium">
                  {activity.activityType === "medication_taken" && "Medication Taken"}
                  {activity.activityType === "low_supply" && "Low Supply Alert"}
                  {activity.activityType === "appointment_scheduled" && "Appointment Scheduled"}
                  {activity.activityType === "medication_interaction" && "Medication Interaction"}
                  {activity.activityType === "prescription_refilled" && "Prescription Refilled"}
                </div>
                <div className="text-sm text-gray-500">{activity.description}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(activity.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
