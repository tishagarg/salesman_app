export enum LeadStatus {
  Prospect = "Prospect",
  Signed = "Signed",
  Hot_Lead = "Hot Lead",
  Start_Signing = "Start Signing",
  Meeting = "Meeting",
  Not_Interested = "Not Interested",
  Not_Available = "Not Available",
  Get_Back = "Get Back",
}
export const leadStatusColors: Record<LeadStatus, { name: string; hex: string }> = {
  [LeadStatus.Prospect]: { name: "Orange", hex: "#FFDAB9" }, // Light orange
  [LeadStatus.Signed]: { name: "Green", hex: "#90EE90" },   // Light green
  [LeadStatus.Hot_Lead]: { name: "Purple", hex: "#D8BFD8" }, // Light purple
  [LeadStatus.Start_Signing]: { name: "Light Blue", hex: "#B0E0E6" }, // Light light blue
  [LeadStatus.Meeting]: { name: "Blue", hex: "#ADD8E6" },   // Light blue
  [LeadStatus.Not_Interested]: { name: "Red", hex: "#FADADD" }, // Light red
  [LeadStatus.Not_Available]: { name: "Yellow", hex: "#FFFFE0" }, // Light yellow
  [LeadStatus.Get_Back]: { name: "Orange", hex: "#FFDAB9" }, // Light orange
};


export enum Source {
  Manual = "Manual",
  Excel = "Excel",
  Email = "Email",
}