"use client";

type Dept = {
  id: string;
  departmentName: string;
  currentPatients: number;
  availableDoctors: number;
  avgWaitTime: number;
};

type Props = {
  departments: Dept[];
};

export function DepartmentLoadPanel({ departments }: Props) {
  if (departments.length === 0) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">
          No department data. Seed DepartmentLoad table to see occupancy and wait times.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Department</th>
            <th className="pb-3 pr-4 font-medium">Current patients</th>
            <th className="pb-3 pr-4 font-medium">Available doctors</th>
            <th className="pb-3 font-medium">Avg wait (min)</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium text-foreground">{d.departmentName}</td>
              <td className="py-3 pr-4 text-muted-foreground">{d.currentPatients}</td>
              <td className="py-3 pr-4 text-muted-foreground">{d.availableDoctors}</td>
              <td className="py-3 text-muted-foreground">{d.avgWaitTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
