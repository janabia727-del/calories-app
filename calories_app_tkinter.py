import tkinter as tk
from tkinter import ttk, messagebox

def calculate_calories():
    try:
        name = entry_name.get().strip()
        gender = combo_gender.get().lower()
        age = int(entry_age.get())
        height = float(entry_height.get())
        weight = float(entry_weight.get())
        goal = combo_goal.get().lower()
        walking_speed = combo_speed.get().lower()
        minutes = int(entry_minutes.get())

        if not name:
            messagebox.showerror("Error", "Please enter your name")
            return

        if gender == "male":
            calories = (10 * weight) + (6.25 * height) - (5 * age) + 5
        elif gender == "female":
            calories = (10 * weight) + (6.25 * height) - (5 * age) - 161
        else:
            messagebox.showerror("Error", "Please choose a valid gender")
            return

        base_calories = calories

        if goal == "lose":
            calories -= 500
        elif goal == "gain":
            calories += 500
        elif goal == "maintain":
            pass
        else:
            messagebox.showerror("Error", "Please choose a valid goal")
            return

        if walking_speed == "slow":
            rate = 2.8
        elif walking_speed == "medium":
            rate = 3.5
        elif walking_speed == "fast":
            rate = 4.3
        else:
            messagebox.showerror("Error", "Please choose a valid walking speed")
            return

        walking_calories = rate * weight * (minutes / 60)
        final_calories = calories + walking_calories

        result_label.config(
            text=(
                f"Hello {name}\n"
                f"Base calories: {int(base_calories)}\n"
                f"Calories burned from walking: {int(walking_calories)}\n"
                f"Final daily calorie needs: {int(final_calories)} calories"
            )
        )

    except ValueError:
        messagebox.showerror("Error", "Please enter numbers correctly")

root = tk.Tk()
root.title("Calories Calculator")
root.geometry("430x560")
root.resizable(False, False)

tk.Label(root, text="Calories Calculator", font=("Arial", 18, "bold")).pack(pady=12)

tk.Label(root, text="Name").pack()
entry_name = tk.Entry(root, width=32)
entry_name.pack(pady=2)

tk.Label(root, text="Gender").pack()
combo_gender = ttk.Combobox(root, values=["male", "female"], width=29, state="readonly")
combo_gender.pack(pady=2)

tk.Label(root, text="Age").pack()
entry_age = tk.Entry(root, width=32)
entry_age.pack(pady=2)

tk.Label(root, text="Height (cm)").pack()
entry_height = tk.Entry(root, width=32)
entry_height.pack(pady=2)

tk.Label(root, text="Weight (kg)").pack()
entry_weight = tk.Entry(root, width=32)
entry_weight.pack(pady=2)

tk.Label(root, text="Goal").pack()
combo_goal = ttk.Combobox(root, values=["lose", "gain", "maintain"], width=29, state="readonly")
combo_goal.pack(pady=2)

tk.Label(root, text="Walking speed").pack()
combo_speed = ttk.Combobox(root, values=["slow", "medium", "fast"], width=29, state="readonly")
combo_speed.pack(pady=2)

tk.Label(root, text="Walking minutes per day").pack()
entry_minutes = tk.Entry(root, width=32)
entry_minutes.pack(pady=2)

tk.Button(root, text="Calculate", command=calculate_calories).pack(pady=16)

result_label = tk.Label(root, text="", font=("Arial", 11), justify="left")
result_label.pack(pady=12)

root.mainloop()