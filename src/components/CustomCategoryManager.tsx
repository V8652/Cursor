import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Plus, Trash, Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getUserCategories, saveUserCategories } from '@/lib/db';
import { pickFile } from '@/lib/file-utils';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl } from './ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ColorPicker from './ColorPicker';
import CategoryIconSelector from './CategoryIconSelector';
import { CategoryIconName, categoryIconMap } from '@/lib/category-icons';
import { isAndroidDevice } from '@/lib/platform-utils';
import { forceDownloadCSV } from '@/lib/csv-utils';

// Schema for adding a new category
const categoryFormSchema = z.object({
  categoryName: z.string().min(2, {
    message: "Category name must be at least 2 characters.",
  }),
  categoryColor: z.string().min(1, {
    message: "Please select a color.",
  }),
  categoryIcon: z.string().min(1, {
    message: "Please select an icon.",
  }),
});

// Schema for editing an existing category
const editCategoryFormSchema = z.object({
  categoryColor: z.string().min(1, {
    message: "Please select a color.",
  }),
  categoryIcon: z.string().min(1, {
    message: "Please select an icon.",
  }),
});

const normalizeCategoryKey = (category: string) =>
  (category || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').trim();

const CustomCategoryManager = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [categoryIcons, setCategoryIcons] = useState<Record<string, CategoryIconName>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      categoryName: "",
      categoryColor: "#1C4E80",
      categoryIcon: "DollarSign" as CategoryIconName,
    },
  });
  
  const editForm = useForm<z.infer<typeof editCategoryFormSchema>>({
    resolver: zodResolver(editCategoryFormSchema),
    defaultValues: {
      categoryColor: "#1C4E80",
      categoryIcon: "DollarSign" as CategoryIconName,
    },
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const userCategories = await getUserCategories();
      setExpenseCategories(userCategories.expenseCategories || []);
      setIncomeCategories(userCategories.incomeCategories || []);
      setCategoryColors(userCategories.categoryColors || {});
      
      // Fix the category icons type handling
      const icons = userCategories.categoryIcons || {};
      // Convert to the correct type - ensure all values are valid CategoryIconName
      const typedIcons: Record<string, CategoryIconName> = {};
      
      Object.entries(icons).forEach(([key, value]) => {
        // Ensure the icon name is a valid CategoryIconName by checking if it exists in categoryIconMap
        if (typeof value === 'string' && value in categoryIconMap) {
          typedIcons[key] = value as CategoryIconName;
        } else {
          // Fallback to DollarSign for invalid icons
          typedIcons[key] = 'DollarSign';
        }
      });
      
      setCategoryIcons(typedIcons);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleExportCategories = async () => {
    try {
      setIsExporting(true);
      // Get categories to export
      const userCategories = await getUserCategories();
      const customExpenseCategories = userCategories.expenseCategories || [];
      const customIncomeCategories = userCategories.incomeCategories || [];
      const colors = userCategories.categoryColors || {};
      const icons = userCategories.categoryIcons || {};

      if (customExpenseCategories.length === 0 && customIncomeCategories.length === 0) {
        toast({
          title: "No Data to Export",
          description: "You don't have any custom categories to export yet. Create some categories first.",
          variant: "destructive"
        });
        return;
      }

      // Prepare export data (array of objects for robust CSV)
      const exportData: Array<{category_name: string, category_type: string, color: string, icon: string}> = [];
      customExpenseCategories.forEach(category => {
        exportData.push({
          category_name: category,
          category_type: 'expense',
          color: colors[category] || '#8E9196',
          icon: icons[category] || 'DollarSign',
        });
      });
      customIncomeCategories.forEach(category => {
        exportData.push({
          category_name: category,
          category_type: 'income',
          color: colors[category] || '#8E9196',
          icon: icons[category] || 'DollarSign',
        });
      });

      // Generate filename with timestamp
      const date = new Date();
      const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const filename = `categories_${timestamp}.csv`;

      // Convert data to CSV
      const Papa = (await import('papaparse')).default;
      const csvContent = Papa.unparse(exportData, { 
        header: true, 
        skipEmptyLines: true,
        quotes: true // Always quote fields for safety
      });

      // Use our improved CSV download function
      await forceDownloadCSV(csvContent, filename);

      // Show appropriate success message based on platform
      if (isAndroidDevice()) {
        toast({
          title: "Export Complete",
          description: "Your categories have been saved. Check your Downloads folder or Files app to view them.",
          duration: 5000
        });
      } else {
        toast({
          title: "Export Complete",
          description: "Your categories have been exported successfully.",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error exporting categories:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export categories: ${(error as Error).message}. Please try again.`,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCategories = async () => {
    try {
      setIsImporting(true);
      const file = await pickFile(['text/csv', '.csv', 'application/vnd.ms-excel']);
      if (!file) {
        toast({
          title: "Import Cancelled",
          description: "No file was selected for import.",
          variant: "destructive"
        });
        setIsImporting(false);
        return;
      }
      const text = await file.text();
      const Papa = (await import('papaparse')).default;
      const results = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
        toast({
          title: "Invalid or Empty CSV",
          description: "No valid category data found in the CSV file.",
          variant: "destructive"
        });
        return;
      }
      // Load current categories
      const userCategories = await getUserCategories();
      const newExpenseCategories = [...(userCategories.expenseCategories || [])];
      const newIncomeCategories = [...(userCategories.incomeCategories || [])];
      const newCategoryColors = { ...(userCategories.categoryColors || {}) };
      const existingIcons = userCategories.categoryIcons || {};
      const newCategoryIcons: Record<string, CategoryIconName> = { ...existingIcons as Record<string, CategoryIconName> };
      let added = 0;
      let skipped = 0;
      for (const rowRaw of results.data) {
        const row = rowRaw as { category_name?: string; category_type?: string; color?: string; icon?: string };
        const categoryName = (row.category_name || '').trim();
        const categoryType = (row.category_type || '').trim().toLowerCase();
        const color = (row.color || '#8E9196').trim();
        let icon: CategoryIconName = 'DollarSign';
        if (row.icon && typeof row.icon === 'string' && row.icon in categoryIconMap) {
          icon = row.icon as CategoryIconName;
        }
        if (!categoryName || !categoryType) {
          skipped++;
          continue;
        }
        if (categoryName === 'other') {
          skipped++;
          continue;
        }
        if (categoryType === 'expense') {
          if (!newExpenseCategories.includes(categoryName)) {
            newExpenseCategories.push(categoryName);
            newCategoryColors[categoryName] = color;
            newCategoryIcons[categoryName] = icon;
            added++;
          } else {
            skipped++;
          }
        } else if (categoryType === 'income') {
          if (!newIncomeCategories.includes(categoryName)) {
            newIncomeCategories.push(categoryName);
            newCategoryColors[categoryName] = color;
            newCategoryIcons[categoryName] = icon;
            added++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      }
      await saveUserCategories({
        id: 'user-categories',
        expenseCategories: newExpenseCategories,
        incomeCategories: newIncomeCategories,
        categoryColors: newCategoryColors,
        categoryIcons: newCategoryIcons
      });
      dbEvents.emit(DatabaseEvent.CATEGORIES_IMPORTED);
      setExpenseCategories(newExpenseCategories);
      setIncomeCategories(newIncomeCategories);
      setCategoryColors(newCategoryColors);
      setCategoryIcons(newCategoryIcons);
      toast({
        title: "Import Complete",
        description: `Added ${added} categories, skipped ${skipped} duplicates or invalid rows.`,
      });
    } catch (error) {
      console.error('Error importing categories:', error);
      toast({
        title: "Import Failed",
        description: `Failed to import categories: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleAddCategory = async (data: z.infer<typeof categoryFormSchema>) => {
    try {
      const { categoryName, categoryColor, categoryIcon } = data;
      const normalizedName = normalizeCategoryKey(categoryName);
      
      if (normalizedName === 'other') {
        toast({
          title: "Reserved Name",
          description: "Cannot use 'other' as a category name as it is reserved.",
          variant: "destructive"
        });
        return;
      }
      
      const userCategories = await getUserCategories();
      
      const currentExpenseCategories = userCategories.expenseCategories || [];
      const currentIncomeCategories = userCategories.incomeCategories || [];
      const currentColors = userCategories.categoryColors || {};
      
      // Fix the category icons type handling
      const currentIcons = userCategories.categoryIcons || {};
      
      // Check if category already exists
      if (activeTab === 'expense' && currentExpenseCategories.includes(normalizedName)) {
        toast({
          title: "Duplicate Category",
          description: "This expense category already exists.",
          variant: "destructive"
        });
        return;
      }
      
      if (activeTab === 'income' && currentIncomeCategories.includes(normalizedName)) {
        toast({
          title: "Duplicate Category",
          description: "This income category already exists.",
          variant: "destructive"
        });
        return;
      }
      
      // Add new category
      if (activeTab === 'expense') {
        currentExpenseCategories.push(normalizedName);
      } else {
        currentIncomeCategories.push(normalizedName);
      }
      
      // Save color and icon - ensure we're passing valid values
      currentColors[normalizedName] = categoryColor || "#1C4E80";
      
      // Validate that the icon is a valid CategoryIconName
      const iconValue = categoryIcon || "DollarSign";
      if (!(iconValue in categoryIconMap)) {
        currentIcons[normalizedName] = "DollarSign";
      } else {
        currentIcons[normalizedName] = iconValue;
      }
      
      console.log("Saving new category:", {
        name: normalizedName,
        color: categoryColor,
        icon: categoryIcon
      });
      
      // Save to database
      await saveUserCategories({
        id: 'user-categories',
        expenseCategories: currentExpenseCategories,
        incomeCategories: currentIncomeCategories,
        categoryColors: currentColors,
        categoryIcons: currentIcons
      });
      
      // Update local state
      setExpenseCategories(currentExpenseCategories);
      setIncomeCategories(currentIncomeCategories);
      setCategoryColors(currentColors);
      
      // Fix for TS2345 error - properly cast the icons before setting state
      const updatedIcons: Record<string, CategoryIconName> = { ...categoryIcons };
      // Add the new category icon with proper type checking
      if (iconValue in categoryIconMap) {
        updatedIcons[normalizedName] = iconValue as CategoryIconName;
      } else {
        updatedIcons[normalizedName] = 'DollarSign';
      }
      setCategoryIcons(updatedIcons);
      
      // Emit event for category changes
      dbEvents.emit(DatabaseEvent.CATEGORIES_IMPORTED);
      
      // Reset form and close dialog
      form.reset();
      setIsAddDialogOpen(false);
      
      toast({
        title: "Category Added",
        description: `Added "${categoryName}" to ${activeTab} categories.`
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: `Failed to add category: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCategory = async (category: string) => {
    try {
      const userCategories = await getUserCategories();
      
      if (activeTab === 'expense') {
        const newExpenseCategories = userCategories.expenseCategories?.filter(c => c !== category) || [];
        userCategories.expenseCategories = newExpenseCategories;
        setExpenseCategories(newExpenseCategories);
      } else {
        const newIncomeCategories = userCategories.incomeCategories?.filter(c => c !== category) || [];
        userCategories.incomeCategories = newIncomeCategories;
        setIncomeCategories(newIncomeCategories);
      }
      
      // Save to database
      await saveUserCategories(userCategories);
      
      // Emit event for category changes
      dbEvents.emit(DatabaseEvent.CATEGORIES_IMPORTED);
      
      toast({
        title: "Category Deleted",
        description: `Removed "${category}" from ${activeTab} categories.`
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: `Failed to delete category: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // New function to open edit dialog and populate form
  const handleEditCategory = (category: string) => {
    const normalizedName = normalizeCategoryKey(category);
    setEditingCategory(normalizedName);
    
    // Set default values from existing category data with proper type handling
    editForm.reset({
      categoryColor: categoryColors[normalizedName] || "#1C4E80",
      categoryIcon: (categoryIcons[normalizedName] || "DollarSign") as CategoryIconName
    });
    
    setIsEditDialogOpen(true);
  };
  
  // New function to save edited category
  const handleSaveEditedCategory = async (data: z.infer<typeof editCategoryFormSchema>) => {
    if (!editingCategory) return;
    const normalizedName = normalizeCategoryKey(editingCategory);
    
    try {
      const { categoryColor, categoryIcon } = data;
      const userCategories = await getUserCategories();
      
      const currentColors = userCategories.categoryColors || {};
      const currentIcons = userCategories.categoryIcons || {};
      
      console.log("Saving edited category:", {
        name: normalizedName,
        newColor: categoryColor,
        newIcon: categoryIcon
      });
      
      // Update color
      currentColors[normalizedName] = categoryColor || "#1C4E80";
      
      // Update icon with proper validation
      const iconValue = categoryIcon || "DollarSign";
      if (!(iconValue in categoryIconMap)) {
        currentIcons[normalizedName] = "DollarSign";
      } else {
        currentIcons[normalizedName] = iconValue;
      }
      
      // Save to database
      await saveUserCategories({
        ...userCategories,
        categoryColors: currentColors,
        categoryIcons: currentIcons
      });
      
      // Update local state
      setCategoryColors(currentColors);
      
      // Fix for TS2345 error - properly update the categoryIcons state
      const updatedIcons: Record<string, CategoryIconName> = { ...categoryIcons };
      // Update the edited category icon with proper type checking
      if (iconValue in categoryIconMap) {
        updatedIcons[normalizedName] = iconValue as CategoryIconName;
      } else {
        updatedIcons[normalizedName] = 'DollarSign';
      }
      setCategoryIcons(updatedIcons);
      
      // Emit event for category changes
      dbEvents.emit(DatabaseEvent.CATEGORIES_IMPORTED);
      
      // Close dialog
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      
      toast({
        title: "Category Updated",
        description: `Successfully updated "${normalizedName}" category.`
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: `Failed to update category: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 py-[5px]">
      {/* Custom Category Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Categories</CardTitle>
          <CardDescription>
            Add and manage your custom categories with icons and colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'expense' | 'income')}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="expense">Expense Categories</TabsTrigger>
              <TabsTrigger value="income">Income Categories</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expense" className="space-y-4">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense Category
              </Button>
              
              <div className="grid gap-2">
                {expenseCategories.map((category) => (
                  <div 
                    key={category}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: `${categoryColors[category] || '#8E9196'}20` }}
                        onClick={() => handleEditCategory(category)}
                      >
                        {(() => {
                          const IconComponent = categoryIcons[category] 
                            ? categoryIconMap[categoryIcons[category]]
                            : categoryIconMap.DollarSign;
                          return <IconComponent className="h-4 w-4" style={{ color: categoryColors[category] || '#8E9196' }} />;
                        })()}
                      </div>
                      <span className="font-medium capitalize">
                        {category.replace(/-/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditCategory(category)}
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCategory(category)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {expenseCategories.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No custom expense categories yet
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="income" className="space-y-4">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Income Category
              </Button>
              
              <div className="grid gap-2">
                {incomeCategories.map((category) => (
                  <div 
                    key={category}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: `${categoryColors[category] || '#8E9196'}20` }}
                        onClick={() => handleEditCategory(category)}
                      >
                        {(() => {
                          const IconComponent = categoryIcons[category] 
                            ? categoryIconMap[categoryIcons[category]]
                            : categoryIconMap.DollarSign;
                          return <IconComponent className="h-4 w-4" style={{ color: categoryColors[category] || '#8E9196' }} />;
                        })()}
                      </div>
                      <span className="font-medium capitalize">
                        {category.replace(/-/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditCategory(category)}
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCategory(category)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {incomeCategories.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No custom income categories yet
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Import/Export Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import/Export Categories</CardTitle>
          <CardDescription>
            Import and export your custom categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="default" 
              onClick={handleExportCategories} 
              disabled={isExporting}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Categories"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleImportCategories} 
              disabled={isImporting}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Import Categories"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {activeTab === 'expense' ? 'Expense' : 'Income'} Category</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCategory)} className="space-y-4">
              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <CategoryIconSelector 
                          value={field.value as CategoryIconName}
                          onChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="categoryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <ColorPicker 
                          value={field.value} 
                          onChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Category</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editingCategory && editingCategory.charAt(0).toUpperCase() + editingCategory.slice(1).replace(/-/g, ' ')}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleSaveEditedCategory)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="categoryIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <CategoryIconSelector 
                          value={field.value as CategoryIconName}
                          onChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="categoryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <ColorPicker 
                          value={field.value} 
                          onChange={(value) => field.onChange(value)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomCategoryManager;
