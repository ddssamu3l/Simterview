"use client"
import React, { useState } from 'react'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { generateCustomInterview } from '@/app/api/google/generate/route'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation'

const interviewFormSchema = z.object({
  type: z.enum(["behavioral", "technical"]),
  role: z.string().min(1, "Role is required"),
  length: z.number().int().min(25).max(60),
  difficulty: z.enum(["Intern", "Junior/New Grad", "Mid Level", "Senior"]),
  jobDescription: z.string().optional(),
})

const CustomInterviewForm = () => {
  const form = useForm<z.infer<typeof interviewFormSchema>>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      type: "behavioral",
      role: "",
      length: 30,
      difficulty: "Intern",
      jobDescription: "",
    },
  })

  const isBehavioral = form.watch("type") === "behavioral";
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function onSubmit({type, role, length, difficulty, jobDescription}: z.infer<typeof interviewFormSchema>) {
    

    try{
      setIsGenerating(true);
      const user = auth.currentUser;
      if (!user) {
        console.error("No user signed in.");
        return;
      }
      const uid = user.uid;
      // generate a new interview and get its id from the backend
      const { id } = await generateCustomInterview(type, role, length, difficulty, jobDescription, uid);
      toast.success("Interview generated successfully!");
      router.push(`/live-interview/${id}`);
    }catch(error){
      if (error instanceof Error && error.message !== "NEXT_REDIRECT"){
        console.error("Error generating custom interview: " + error);
        toast.error("Error generating interview: " + error);
        return;
      }
    }finally{
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex items-center justify-center mx-auto max-w-7xl h-screen max-sm:px-4 max-sm:py-8 mt-[-96]">
      <div className="card-border max-sm:border-none min-w-[300px] lg:min-w-[566px] max-w-lg">
        <div className="flex flex-col gap-6 card py-14 px-10">
          <div className="flex flex-row gap-2 justify-center">
            <h1 className="text-light-100">Custom Interview</h1>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 mt-2 form">

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Interview Type*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select interview type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                            <SelectItem value="technical">Technical Interview</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Role*</FormLabel>
                    <FormControl>
                      <Input placeholder="Write interview role..."{...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Length*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select interview duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="25">25 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Difficulty*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Intern">Intern</SelectItem>
                            <SelectItem value="Junior/New Grad">Junior/New Grad</SelectItem>
                            <SelectItem value="Mid Level">Mid Level</SelectItem>
                            <SelectItem value="Senior">Senior</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isBehavioral && (
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="label">Job Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste job description here..."
                          className="max-sm:min-h-[120px] max-sm:max-h-[120px] min-h-[200px] max-h-[200px]"
                          style={{ resize: "none" }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full py-3 rounded-md font-bold"
                >
                  {isGenerating? "Generating..." : "Create Interview"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default CustomInterviewForm