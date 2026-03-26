"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Bell, FileText, Zap, Clock, Timer, Key, Users, AlertTriangle, MessageSquare } from "lucide-react"

const alertsLinks = [
  {
    title: "Capacity",
    href: "/alerts/capacity",
    description: "Monitor queue capacity and backlog in real-time",
    icon: Zap,
  },
  {
    title: "Token",
    href: "/alerts/token",
    description: "Manage authentication tokens for API requests",
    icon: Key,
  },
  {
    title: "Adherence",
    href: "/alerts/adherence",
    description: "Track agent adherence metrics",
    icon: Clock,
  },
  {
    title: "THT",
    href: "/alerts/tht",
    description: "Average Handling Time monitoring",
    icon: Timer,
  },
]

const dashboardLinks = [
  {
    title: "Overview",
    href: "/dashboard",
    description: "Main dashboard with key metrics",
    icon: LayoutDashboard,
  },
]

const reportsLinks = [
  {
    title: "SLA Breached",
    href: "/reports/sla-breached",
    description: "Reporte de chats vencidos",
    icon: AlertTriangle,
  },
  {
    title: "Contact Reason",
    href: "/reports/contact-reason",
    description: "Reporte de razones de contacto",
    icon: MessageSquare,
  },
  {
    title: "THT High",
    href: "/reports/tht-high",
    description: "Reporte de THT elevado",
    icon: Timer,
  },
]

const workersLinks = [
  {
    title: "Workers",
    href: "/workers",
    description: "View and manage agent schedules",
    icon: Users,
  },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Zap className="h-5 w-5 text-slate-950" />
            <div className="absolute inset-0 rounded-lg bg-cyan-400/20 blur-md" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            QueueMonitor
          </span>
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {/* Dashboard */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-cyan-400 data-[state=open]:bg-slate-800/50 data-[state=open]:text-cyan-400">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[300px] gap-1 p-2">
                  {dashboardLinks.map((link) => (
                    <ListItem
                      key={link.href}
                      title={link.title}
                      href={link.href}
                      icon={link.icon}
                      isActive={pathname === link.href}
                    >
                      {link.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Alerts */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-cyan-400 data-[state=open]:bg-slate-800/50 data-[state=open]:text-cyan-400">
                <Bell className="mr-2 h-4 w-4" />
                Alerts
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-1 p-2 md:grid-cols-2">
                  {alertsLinks.map((link) => (
                    <ListItem
                      key={link.href}
                      title={link.title}
                      href={link.href}
                      icon={link.icon}
                      isActive={pathname === link.href}
                    >
                      {link.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Reports */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-cyan-400 data-[state=open]:bg-slate-800/50 data-[state=open]:text-cyan-400">
                <FileText className="mr-2 h-4 w-4" />
                Reports
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-1 p-2 md:grid-cols-1">
                  {reportsLinks.map((link) => (
                    <ListItem
                      key={link.href}
                      title={link.title}
                      href={link.href}
                      icon={link.icon}
                      isActive={pathname === link.href}
                    >
                      {link.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Workers */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-cyan-400 data-[state=open]:bg-slate-800/50 data-[state=open]:text-cyan-400">
                <Users className="mr-2 h-4 w-4" />
                Workers
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[300px] gap-1 p-2">
                  {workersLinks.map((link) => (
                    <ListItem
                      key={link.href}
                      title={link.title}
                      href={link.href}
                      icon={link.icon}
                      isActive={pathname === link.href}
                    >
                      {link.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}

function ListItem({
  className,
  title,
  children,
  href,
  icon: Icon,
  isActive,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & {
  icon: React.ElementType
  isActive?: boolean
}) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href ?? "#"}
          className={cn(
            "flex select-none gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors",
            "hover:bg-slate-800/60 hover:text-cyan-400",
            "focus:bg-slate-800/60 focus:text-cyan-400",
            isActive && "bg-slate-800/80 text-cyan-400 border border-cyan-500/30",
            className
          )}
          {...props}
        >
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            isActive 
              ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-400" 
              : "bg-slate-800 text-slate-400"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium leading-none text-foreground">
              {title}
            </div>
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {children}
            </p>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
