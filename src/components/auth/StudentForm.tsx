import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowRight, BookOpen, GraduationCap, User } from 'lucide-react';

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
import { FacialRegistration } from './FacialRegistration';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Import mock data from AuthContext
import { MOCK_PROGRAMS, MOCK_COURSES, getStudentByStudentId } from '@/contexts/AuthContext';

// --- Schema ---
const formSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  program: z.string().min(1, "Please select a program"),
  semester: z.string().min(1, "Please select a semester"),
  courses: z.array(z.string()).min(1, "Select at least one course"),
  faceEmbedding: z.string().min(1, "Face registration is required"), 
});

type FormValues = z.infer<typeof formSchema>;

export const StudentForm = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            studentId: '',
            email: '',
            fullName: '',
            program: '',
            semester: '',
            courses: [],
            faceEmbedding: '',
        },
    });

    // Auto-fill logic using the centralized function
    const studentId = form.watch('studentId');
    useEffect(() => {
        if (studentId) {
            const studentData = getStudentByStudentId(studentId);
            if (studentData) {
                form.setValue('email', studentData.email);
                form.setValue('fullName', studentData.name);
                if (studentData.program) {
                    form.setValue('program', studentData.program);
                }
                if (studentData.semester) {
                    form.setValue('semester', studentData.semester);
                }
                toast({
                    title: "Student Found",
                    description: `Details loaded for ${studentData.name}`,
                });
            }
        }
    }, [studentId, form, toast]);

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('Submission Data:', JSON.stringify(data, null, 2));
            
            toast({
                title: "Registration Successful",
                description: "Your information and facial data have been verified.",
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
                 <h2 className="text-2xl font-bold tracking-tight">Student Registration</h2>
                 <p className="text-muted-foreground">Verify your identity and enroll for the semester.</p>
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
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter Student ID (e.g., 123456)" {...field} />
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
                           <GraduationCap className="w-5 h-5" />
                           <h3 className="font-semibold text-lg">Academic Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                              control={form.control}
                              name="program"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Program</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Program" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {MOCK_PROGRAMS.map(prog => (
                                            <SelectItem key={prog.value} value={prog.value}>{prog.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="semester"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Semester</FormLabel>
                                   <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Semester" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="1">Semester 1</SelectItem>
                                        <SelectItem value="2">Semester 2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>

                         <FormField
                              control={form.control}
                              name="courses"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Courses Registered</FormLabel>
                                  <FormControl>
                                     <MultiSelect
                                        options={MOCK_COURSES.map(c => ({ label: c.name, value: c.id }))}
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

                    {/* Facial Registration Section */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-2 text-primary border-b pb-2">
                           <BookOpen className="w-5 h-5" />
                           <h3 className="font-semibold text-lg">Facial Verification</h3>
                        </div>
                         
                         <FormField
                              control={form.control}
                              name="faceEmbedding"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Face Capture</FormLabel>
                                  <FormControl>
                                     <FacialRegistration
                                        onCapture={(data) => {
                                            // In a real app, this would process the image to get embeddings
                                            // For now we just store the base64 string or a dummy value "captured"
                                            field.onChange(data ? "captured" : ""); 
                                        }}
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