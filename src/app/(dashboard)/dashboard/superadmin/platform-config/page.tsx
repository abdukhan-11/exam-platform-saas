"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Flag, 
  Bell, 
  Save, 
  RotateCcw, 
  Download, 
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface PlatformConfig {
  globalSettings: {
    defaultSubscriptionTier: string;
    maxUsersPerCollege: number;
    maxStoragePerCollege: number;
    maintenanceMode: boolean;
    systemAnnouncements: boolean;
  };
  featureFlags: {
    [key: string]: {
      enabled: boolean;
      subscriptionTiers: string[];
      description: string;
    };
  };
  announcements: Array<{
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "maintenance" | "update";
    active: boolean;
    startDate: string;
    endDate: string;
    targetAudience: string[];
  }>;
  configurationVersion: string;
  lastModified: string;
  modifiedBy: string;
}

export default function PlatformConfigPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "info" as const,
    targetAudience: [] as string[]
  });

  const subscriptionTiers = ["free", "basic", "premium", "enterprise"];

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/platform-config');
      if (!response.ok) {
        throw new Error('Failed to fetch platform configuration');
      }
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch platform config:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      // TODO: Implement actual save logic
      // await fetch('/api/admin/platform-config', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config)
      // });
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update version and timestamp
      if (config) {
        setConfig({
          ...config,
          configurationVersion: "1.2.1",
          lastModified: new Date().toISOString(),
          modifiedBy: "super.admin@platform.com"
        });
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureFlagToggle = (feature: string, enabled: boolean) => {
    if (config) {
      setConfig({
        ...config,
        featureFlags: {
          ...config.featureFlags,
          [feature]: {
            ...config.featureFlags[feature],
            enabled
          }
        }
      });
    }
  };

  const handleGlobalSettingChange = (key: keyof PlatformConfig['globalSettings'], value: any) => {
    if (config) {
      setConfig({
        ...config,
        globalSettings: {
          ...config.globalSettings,
          [key]: value
        }
      });
    }
  };

  const addAnnouncement = () => {
    if (newAnnouncement.title && newAnnouncement.message && config) {
      const announcement = {
        id: Date.now().toString(),
        ...newAnnouncement,
        active: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };
      
      setConfig({
        ...config,
        announcements: [...config.announcements, announcement]
      });
      
      setNewAnnouncement({
        title: "",
        message: "",
        type: "info",
        targetAudience: []
      });
    }
  };

  const toggleAnnouncement = (id: string) => {
    if (config) {
      setConfig({
        ...config,
        announcements: config.announcements.map(announcement =>
          announcement.id === id
            ? { ...announcement, active: !announcement.active }
            : announcement
        )
      });
    }
  };

  const deleteAnnouncement = (id: string) => {
    if (config) {
      setConfig({
        ...config,
        announcements: config.announcements.filter(announcement => announcement.id !== id)
      });
    }
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "update":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Configuration Error</h2>
        <p className="text-muted-foreground">Failed to load platform configuration</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-muted-foreground">
            Manage global settings, feature flags, and system announcements
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Settings className="h-3 w-3" />
            <span>v{config.configurationVersion}</span>
          </Badge>
          <Button onClick={handleSaveConfig} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Last modified: {new Date(config.lastModified).toLocaleString()} by {config.modifiedBy}
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="versioning">Version Control</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure global platform parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultTier">Default Subscription Tier</Label>
                  <Select
                    value={config.globalSettings.defaultSubscriptionTier}
                    onValueChange={(value) => handleGlobalSettingChange("defaultSubscriptionTier", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionTiers.map(tier => (
                        <SelectItem key={tier} value={tier}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max Users per College</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={config.globalSettings.maxUsersPerCollege}
                    onChange={(e) => handleGlobalSettingChange("maxUsersPerCollege", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStorage">Max Storage per College (GB)</Label>
                  <Input
                    id="maxStorage"
                    type="number"
                    value={config.globalSettings.maxStoragePerCollege}
                    onChange={(e) => handleGlobalSettingChange("maxStoragePerCollege", parseInt(e.target.value))}
                  />
                </div>

                                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="maintenanceMode"
                        checked={config.globalSettings.maintenanceMode}
                        onCheckedChange={(checked: boolean) => handleGlobalSettingChange("maintenanceMode", checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {config.globalSettings.maintenanceMode ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Control feature availability by subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.featureFlags).map(([feature, config]) => (
                  <div key={feature} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Flag className="h-4 w-4 text-blue-500" />
                        <h3 className="font-medium capitalize">{feature.replace(/([A-Z])/g, ' $1')}</h3>
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {config.subscriptionTiers.map(tier => (
                          <Badge key={tier} variant="outline" className="text-xs">
                            {tier}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                                             <Checkbox
                         checked={config.enabled}
                         onCheckedChange={(enabled: boolean) => handleFeatureFlagToggle(feature, enabled)}
                       />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Announcements</CardTitle>
              <CardDescription>Manage platform-wide announcements and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New Announcement Form */}
              <div className="p-4 border rounded-lg space-y-4">
                <h3 className="font-medium">Create New Announcement</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="announcementTitle">Title</Label>
                    <Input
                      id="announcementTitle"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      placeholder="Announcement title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcementType">Type</Label>
                    <Select
                      value={newAnnouncement.type}
                      onValueChange={(value: any) => setNewAnnouncement({...newAnnouncement, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Information</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announcementMessage">Message</Label>
                  <Input
                    id="announcementMessage"
                    value={newAnnouncement.message}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                    placeholder="Announcement message"
                  />
                </div>
                <Button onClick={addAnnouncement} disabled={!newAnnouncement.title || !newAnnouncement.message}>
                  <Bell className="h-4 w-4 mr-2" />
                  Create Announcement
                </Button>
              </div>

              {/* Existing Announcements */}
              <div className="space-y-4">
                <h3 className="font-medium">Active Announcements</h3>
                {config.announcements.filter(a => a.active).map(announcement => (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-lg border ${getAnnouncementTypeColor(announcement.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary">{announcement.type.toUpperCase()}</Badge>
                          <h4 className="font-medium">{announcement.title}</h4>
                        </div>
                        <p className="text-sm mb-2">{announcement.message}</p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(announcement.startDate).toLocaleDateString()} - {new Date(announcement.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAnnouncement(announcement.id)}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAnnouncement(announcement.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <h3 className="font-medium">Inactive Announcements</h3>
                {config.announcements.filter(a => !a.active).map(announcement => (
                  <div
                    key={announcement.id}
                    className="p-4 rounded-lg border bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary">{announcement.type.toUpperCase()}</Badge>
                          <h4 className="font-medium">{announcement.title}</h4>
                        </div>
                        <p className="text-sm mb-2">{announcement.message}</p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(announcement.startDate).toLocaleDateString()} - {new Date(announcement.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAnnouncement(announcement.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAnnouncement(announcement.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versioning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Version Control</CardTitle>
              <CardDescription>Manage configuration versions and rollback capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Current Version</h4>
                  <div className="text-2xl font-bold text-blue-600">{config.configurationVersion}</div>
                  <p className="text-sm text-muted-foreground">
                    Last modified: {new Date(config.lastModified).toLocaleString()}
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Version History</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>v1.2.0</span>
                      <span className="text-muted-foreground">Current</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>v1.1.0</span>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>v1.0.0</span>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Configuration
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Configuration
                </Button>
                <Button variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
