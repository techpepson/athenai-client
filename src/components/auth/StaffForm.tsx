import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowRight, Briefcase, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Import mock data from AuthContext
import { MOCK_DEPARTMENTS, MOCK_COURSES, getStaffByStaffId } from '@/contexts/AuthContext';

// --- Schema ---
const formSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  department: z.string().min(1, "Please select a department"),
  coursesTaught: z.array(z.string()).min(1, "Select at least one course"),
});

type FormValues = z.infer<typeof formSchema>;

export const StaffForm = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            staffId: '',
            email: '',
            fullName: '',
            department: '',
            coursesTaught: [],
        },
    });

    // Auto-fill logic using the centralized function
    const staffId = form.watch('staffId');
    useEffect(() => {
        if (staffId) {
            const staffData = getStaffByStaffId(staffId);
            if (staffData) {
                form.setValue('email', staffData.email);
                form.setValue('fullName', staffData.name);
                if (staffData.department) {
                    form.setValue('department', staffData.department);
                }
                toast({
                    title: "Staff Details Found",
                    description: `Welcome, ${staffData.name}`,
                });
            }
        }
    }, [staffId, form, toast]);

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('Submission Data:', JSON.stringify(data, null, 2));
            
            toast({
                title: "Registration Successful",
                description: "Your staff account has been set up.",
            });
            
            // Navigate to dashboard 
            navigate('/dashboard', { replace: true });

        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in overflow-y-auto px-1">
            <div className="mb-6">
                 <h2 className="text-2xl font-bold tracking-tight">Staff Registration</h2>
                 <p className="text-muted-foreground">Complete your profile to access the lecturer portal.</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-8">
                    
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary border-b pb-2">
                           <User className="w-5 h-5" />
                           <h3 className="font-semibold text-lg">Basic Information</h3>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="staffId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Staff ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter Staff ID (e.g., STF001)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Auto-filled" {...field} readOnly className="bg-muted" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                    </div>

                    {/* Academic Info Section */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-2 text-primary border-b pb-2">
                           <Briefcase className="w-5 h-5" />
                           <h3 className="font-semibold text-lg">Academic Details</h3>
                        </div>

                         <FormField
                              control={form.control}
                              name="department"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Department</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Department" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {MOCK_DEPARTMENTS.map(dept => (
                                            <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                         <FormField
                              control={form.control}
                              name="coursesTaught"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Courses Taught</FormLabel>
                                  <FormControl>
                                     <MultiSelect
                                        options={MOCK_COURSES}
                                        selected={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select courses..."
                                     />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                    </div>

                    <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registering...
                            </>
                        ) : (
                            <>
                                Complete Registration
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
};