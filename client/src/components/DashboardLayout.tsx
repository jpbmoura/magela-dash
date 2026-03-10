import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  PanelLeft,
  Users,
  ShoppingCart,
  Warehouse,
  Package,
  UserSquare2,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/dashboard",
    group: "main",
  },
  {
    icon: Users,
    color: "blue-500",
    label: "Clientes",
    path: "/clientes",
    group: "monitores",
  },
  {
    icon: ShoppingCart,
    color: "purple-500",
    label: "Vendas",
    path: "/vendas",
    group: "monitores",
  },
  {
    icon: Warehouse,
    color: "amber-500",
    label: "Estoque",
    path: "/estoque",
    group: "monitores",
  },
  {
    icon: Package,
    color: "rose-500",
    label: "Produtos",
    path: "/produtos",
    group: "monitores",
  },
  {
    icon: UserSquare2,
    color: "emerald-500",
    label: "Equipe",
    path: "/equipe",
    group: "monitores",
  },
  {
    icon: RefreshCw,
    label: "Atualizar Base",
    path: "/atualizar-base",
    group: "config",
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH)
        setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const mainItems = menuItems.filter(i => i.group === "main");
  const monitorItems = menuItems.filter(i => i.group === "monitores");
  const configItems = menuItems.filter(i => i.group === "config");

  const renderItem = (item: (typeof menuItems)[0]) => {
    const isActive = location === item.path;
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => setLocation(item.path)}
          tooltip={item.label}
          className="h-9 gap-3 rounded-lg font-normal text-sm transition-all"
        >
          <Icon
            className={`h-4 w-4 shrink-0 ${isActive ? `text-${item.color}` : "text-muted-foreground"}`}
          />
          <span className={isActive ? "font-medium" : ""}>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r"
          disableTransition={isResizing}
        >
          {/* Header / Logo */}
          <SidebarHeader className="h-14 border-b px-3 justify-center">
            <div className="flex items-center gap-2.5">
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                    <BarChart2 className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg tracking-tight truncate">
                    CompletEin
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3 gap-0">
            {/* Main */}
            <SidebarMenu className="gap-0.5">
              {mainItems.map(renderItem)}
            </SidebarMenu>

            {/* Monitores */}
            {!isCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-4 pb-1.5">
                Monitores
              </p>
            )}
            {isCollapsed && <div className="h-3" />}
            <SidebarMenu className="gap-0.5">
              {monitorItems.map(renderItem)}
            </SidebarMenu>

            {/* Config */}
            {!isCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-4 pb-1.5">
                Configurações
              </p>
            )}
            {isCollapsed && <div className="h-3" />}
            <SidebarMenu className="gap-0.5">
              {configItems.map(renderItem)}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer — version info only, no user profile */}
          <SidebarFooter className="border-t p-3">
            {!isCollapsed && (
              <p className="text-[10px] text-muted-foreground/50 text-center select-none">
                CompletEin v1.0
              </p>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (!isCollapsed) setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
              <span className="font-medium text-sm">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
