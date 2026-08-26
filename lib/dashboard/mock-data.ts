import { formatRelativeCompleted } from "@/lib/dashboard/dates";

export type TaskStatus = "not_started" | "in_progress" | "completed";
export type TaskPriority = "low" | "moderate" | "extreme";

export type DashboardProfile = {
  firstName: string;
  fullName: string;
  email: string;
  avatarSrc: string;
  initials: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  description: string;
  contentTitle?: string;
  objective?: string;
  additionalNotes?: string[];
  deadlineLabel?: string;
  checklist?: string[];
  optionalItems?: string[];
  detailDescription?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  scheduledAt: string;
  completedAt: string | null;
  thumbnailSrc: string;
  thumbnailAlt: string;
};

export type DashboardTaskView = DashboardTask & {
  isOverdue: boolean;
};

export type StatusPercents = {
  completed: number;
  inProgress: number;
  notStarted: number;
};

const createdOn = "2023-06-20T09:00:00.000Z";

export function isTaskOverdue(task: DashboardTask, now: Date): boolean {
  return task.status !== "completed" && new Date(task.scheduledAt) < now;
}

export function toTaskView(task: DashboardTask, now: Date): DashboardTaskView {
  return {
    ...task,
    isOverdue: isTaskOverdue(task, now),
  };
}

function daysFrom(now: Date, days: number): string {
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function getBirthdayTask(now: Date): DashboardTask {
  return {
    id: "task-birthday",
    title: "Attend Nischal's Birthday Party",
    description:
      "Buy gifts on the way and pick up cake from the bakery. (6 PM | Fresh Elements)",
    checklist: [
      "A cake, with candles to blow out. (Layer cake, cupcake, flat sheet cake)",
      "The birthday song.",
      "A place to collect gifts.",
    ],
    optionalItems: [
      "Paper cone-shaped party hats, paper whistles that unroll.",
      "Games, activities (carry an object with your knees, then drop it into a milk bottle.)",
      "Lunch: sandwich halves, or pizza slices, juice, pretzels, potato chips...THEN cake & candles and the song.",
    ],
    status: "not_started",
    priority: "moderate",
    createdAt: createdOn,
    scheduledAt: daysFrom(now, 1),
    completedAt: null,
    thumbnailSrc: "/dashboard/thumb-party.svg",
    thumbnailAlt: "Birthday party table with balloons and a cake",
  };
}

export function getMockTasks(now: Date): DashboardTask[] {
  return [
    getBirthdayTask(now),
    {
      id: "task-landing",
      title: "Landing Page Design for Travel Booking Website",
      description:
        "Get this done as soon as possible so we can start working on it before the vacation.....",
      status: "in_progress",
      priority: "moderate",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 2),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-laptop.svg",
      thumbnailAlt: "Laptop showing a travel booking website design",
    },
    {
      id: "task-presentation",
      title: "Prepare for the presentation at Client's office in Bangalore",
      description:
        "Finish the slides and practice the demo before the on-site meeting with the client.....",
      status: "not_started",
      priority: "moderate",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 3),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-meeting.svg",
      thumbnailAlt: "Conference room prepared for a client presentation",
    },
    {
      id: "task-dog",
      title: "Walk the dog",
      description:
        "Take the dog to the park and bring treats for the evening walk around the block.",
      status: "completed",
      priority: "moderate",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, -3),
      completedAt: daysFrom(now, -2),
      thumbnailSrc: "/dashboard/thumb-dog.svg",
      thumbnailAlt: "Dog on a leash at the park",
    },
    {
      id: "task-meeting",
      title: "Conduct meeting",
      description:
        "Meet with the client and finalize requirements for the next project milestone.",
      status: "completed",
      priority: "moderate",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, -4),
      completedAt: daysFrom(now, -2),
      thumbnailSrc: "/dashboard/thumb-handshake.svg",
      thumbnailAlt: "Team meeting around a conference table",
    },
  ];
}

export function getMyTasks(now: Date): DashboardTask[] {
  return [
    {
      id: "task-documents",
      title: "Submit Documents",
      contentTitle: "Document Submission",
      objective: "To submit required documents for completion or review.",
      description:
        "Review the listed documents, confirm they are complete and accurate, then submit them through the designated channel before the deadline. Gather any missing paperwork first.",
      additionalNotes: [
        "Ensure all documents are signed and dated.",
        "If submitting in person, bring a copy of each original.",
        "Double-check names and identification numbers.",
      ],
      deadlineLabel: "End of Day",
      status: "not_started",
      priority: "extreme",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 1),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-documents.svg",
      thumbnailAlt: "Stack of documents ready for submission",
    },
    {
      id: "task-monthly-report",
      title: "Complete monthly report",
      description:
        "Compile this month's numbers and finish the performance summary for the team.....",
      status: "in_progress",
      priority: "extreme",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 2),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-report.svg",
      thumbnailAlt: "Monthly report charts on a desk",
    },
    {
      id: "task-grocery",
      title: "Grocery shopping",
      description:
        "Buy vegetables, fruit, dairy, and household items for the week.....",
      status: "in_progress",
      priority: "extreme",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 3),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-grocery.svg",
      thumbnailAlt: "Grocery bag with produce",
    },
    getBirthdayTask(now),
  ];
}

export function getVitalTasks(now: Date): DashboardTask[] {
  return [
    {
      id: "task-walk-dog",
      title: "Walk the dog",
      description: "Take the dog to the park and bring treats as well.",
      detailDescription:
        "Take Luffy and Jiro for a leisurely stroll around the neighborhood. Enjoy the fresh air and give them the exercise and mental stimulation they need for a happy and healthy day. Don't forget to bring along squeaky and fluffy for some extra fun along the way!",
      checklist: [
        "Listen to a podcast or audiobook",
        "Practice mindfulness or meditation",
        "Take photos of interesting sights along the way",
        "Practice obedience training with your dog",
        "Chat with neighbors or other dog walkers",
        "Listen to music or an upbeat playlist",
      ],
      status: "not_started",
      priority: "extreme",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 1),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-dog.svg",
      thumbnailAlt: "Dog on a leash at the park",
    },
    {
      id: "task-grandma",
      title: "Take grandma to hospital",
      description: "Go back home and take grandma to the hospital.",
      status: "in_progress",
      priority: "moderate",
      createdAt: createdOn,
      scheduledAt: daysFrom(now, 2),
      completedAt: null,
      thumbnailSrc: "/dashboard/thumb-hospital.svg",
      thumbnailAlt: "Hospital building with an entrance canopy",
    },
  ];
}

export function getTaskById(id: string, now: Date): DashboardTask | undefined {
  return [...getMockTasks(now), ...getMyTasks(now), ...getVitalTasks(now)].find(
    (task) => task.id === id
  );
}

export function getOpenTasks(tasks: DashboardTaskView[]): DashboardTaskView[] {
  return tasks.filter((task) => task.status !== "completed");
}

export function getCompletedTasks(
  tasks: DashboardTaskView[]
): DashboardTaskView[] {
  return tasks.filter((task) => task.status === "completed");
}

export function getTaskStatusPercents(tasks: DashboardTask[]): StatusPercents {
  const total = tasks.length;

  if (total === 0) {
    return { completed: 0, inProgress: 0, notStarted: 0 };
  }

  const count = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status).length;

  return {
    completed: Math.round((100 * count("completed")) / total),
    inProgress: Math.round((100 * count("in_progress")) / total),
    notStarted: Math.round((100 * count("not_started")) / total),
  };
}

export function getCompletedLabel(
  task: DashboardTask,
  now: Date
): string | null {
  if (!task.completedAt) {
    return null;
  }

  return formatRelativeCompleted(task.completedAt, now);
}

export const statusLabels: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  moderate: "Moderate",
  extreme: "Extreme",
};

export const priorityTextClass: Record<TaskPriority, string> = {
  low: "text-priority-low",
  moderate: "text-priority-moderate",
  extreme: "text-priority-extreme",
};

export const statusTextClass: Record<TaskStatus, string> = {
  not_started: "text-status-not-started",
  in_progress: "text-status-in-progress",
  completed: "text-status-completed",
};

export const statusFillClass: Record<TaskStatus, string> = {
  not_started: "bg-status-not-started",
  in_progress: "bg-status-in-progress",
  completed: "bg-status-completed",
};
